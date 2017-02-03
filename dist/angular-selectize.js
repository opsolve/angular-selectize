/**
 * Angular Selectize2
 * https://github.com/machineboy2045/angular-selectize
 **/

angular.module("selectize", []).value("selectizeConfig", {}).directive("selectize", ["selectizeConfig", function (selectizeConfig) {
    return {
        restrict: "EA",
        require: "^ngModel",
        scope: {
            ngModel: "=",
            config: "=?",
            options: "=?",
            itemSelected: "&?",
            ngBlur: "&?",
            ngDisabled: "=",
            osDisabled: "=",
            ngRequired: "&"
        },
        link: function (scope, element, attrs, modelCtrl) {

            Selectize.defaults.maxItems = null; //default to tag editor

            var selectize,
                config = angular.extend({}, Selectize.defaults, selectizeConfig, scope.config);


            modelCtrl.$setUntouched();
            modelCtrl.$isEmpty = function (val) {
                return val === undefined || val === null || !val.length; //override to support checking empty arrays
            };

            function createItem(input) {
                var data = {};
                data[config.labelField] = input;
                data[config.valueField] = input;
                return data;
            }

            function toggle(disabled) {
                disabled ? selectize.disable() : selectize.enable();
            }

            var validate = function () {
                var isInvalid = (scope.ngRequired() || attrs.required || config.required) && modelCtrl.$isEmpty(scope.ngModel);
                modelCtrl.$setValidity("required", !isInvalid);
            };

            function generateOptions(data) {
                if (!data)
                    return [];

                data = angular.isArray(data) || angular.isObject(data) ? data : [data];

                return $.map(data, function (opt) {
                    return typeof opt === "string" ? createItem(opt) : opt;
                });
            }

            function updateSelectize() {
                validate();

                selectize.$control.toggleClass("ng-valid", modelCtrl.$valid);
                selectize.$control.toggleClass("ng-invalid", modelCtrl.$invalid);
                selectize.$control.toggleClass("ng-dirty", modelCtrl.$dirty);
                selectize.$control.toggleClass("ng-pristine", modelCtrl.$pristine);
                selectize.$control.toggleClass("ng-touched", modelCtrl.$touched);

                selectize.setValue(scope.ngModel);
                selectize.on("blur", function () {
                    modelCtrl.$setTouched();
                });

                if (!angular.equals(selectize.items, scope.ngModel)) {
                    if (selectize.settings.plugins.indexOf("enableType") !== -1 && selectize.settings.create) {
                        selectize.addOption(generateOptions(scope.ngModel));
                    }
                    selectize.setValue(scope.ngModel);
                }

                angular.element(document).on("click", "div.selectize-input div.item", function (event) {
                    if (selectize.items.length > 0) {
                        angular.forEach(selectize.options, function (index, data) {
                            if (selectize.options[data].label === event.currentTarget.innerText) {
                                selectize.removeItem(selectize.options[data].value);
                            }
                        });
                    }

                    if (selectize.items.length === 0) {
                        selectize.close();
                        selectize.blur();
                    }
                });

            }

            var onBlur = config.onBlur,
                onChange = config.onChange,
                onOptionAdd = config.onOptionAdd,
                onType = config.onType;

            config.onBlur = function () {
                if (scope.ngBlur) {
                    scope.ngBlur();
                }
            }

            config.onType = function (value) {
                if (value.length === 0) {
                    selectize.$dropdown_content.removeHighlight();
                }

                if (selectize.settings.plugins.indexOf("enableType") !== -1) {
                    modelCtrl.$setViewValue(value);
                }
            }

            config.onChange = function () {
                if (element[0].selectize.items.length > 0) {
                    var selectizeDependents = angular.element(document).find("[data-dependent=" + attrs.name + "]");

                    angular.forEach(selectizeDependents, function (dependent) {
                        if (dependent.selectize.isDisabled === false) {
                            dependent.selectize.disable();
                            dependent.selectize.clear();
                            angular.element(dependent).attr("data-locked-by", attrs.name);
                        }
                    });
                }

                if (scope.disableOnChange)
                    return;

                if (selectize.items.indexOf(scope.ngModel) === -1) {
                    if (selectize.settings.mode === "multi") {
                        selectize.addOption(generateOptions(scope.ngModel));
                    }
                    if (scope.itemSelected) {
                        scope.itemSelected({ value: angular.copy(selectize.items)[0] });
                    }
                }

                scope.$evalAsync(function () {
                    var value = angular.copy(selectize.items);
                    if (config.maxItems === 1) {
                        value = value[0];
                    }
                    modelCtrl.$setViewValue(value);
                });

                if (onChange) {
                    onChange.apply(this, arguments);
                }
            };

            config.onOptionAdd = function (value, data) {
                if (element[0].hasAttribute("data-locked-by") && !scope.osDisabled &&
                    (!element[0].hasAttribute("data-os-permission-approved") || JSON.parse(element[0].getAttribute("data-os-permission-approved")) === true) &&
                    (!element[0].hasAttribute("data-os-disabled-from-parent") || JSON.parse(element[0].getAttribute("data-os-disabled-from-parent")) === false)) {
                    element[0].selectize.enable();
                    element.removeAttr("data-locked-by");
                }
                if (scope.options.indexOf(data) === -1) {
                    scope.options.push(data);

                    if (onOptionAdd) {
                        onOptionAdd.apply(this, arguments);
                    }
                }
            };

            if (scope.options) {
                // replace scope options with generated options while retaining a reference to the same array
                scope.options.splice(0, scope.options.length, generateOptions(scope.options));
            } else {
                // default options = [ngModel] if no options specified
                scope.options = generateOptions(angular.copy(scope.ngModel));
            }

            var angularCallback = config.onInitialize;

            config.onInitialize = function () {
                selectize = element[0].selectize;
                selectize.addOption(scope.options);
                selectize.setValue(scope.ngModel);

                selectize.on("blur", function () {
                    selectize.$control.addClass("ng-touched");
                });

                selectize.on("dropdown_open", function (dropdown) {
                    var customWidth = Number(attrs.width);

                    if (!isNaN(customWidth) && customWidth > selectize.$control.outerWidth()) {
                        dropdown.css("width", customWidth);
                        if (attrs.expandTo === "left") {
                            dropdown.css("left", selectize.$control.outerWidth() + dropdown.position().left - dropdown.outerWidth());
                        }
                    }
                });

                //provides a way to access the selectize element from an
                //angular controller
                if (angularCallback) {
                    angularCallback(selectize);
                }

                scope.$watch("options", function () {
                    scope.disableOnChange = true;
                    selectize.clearOptions();
                    selectize.addOption(scope.options);
                    scope.disableOnChange = false;
                    if (scope.ngModel) {
                        updateSelectize();
                    }
                }, true);

                scope.$watchCollection("ngModel", updateSelectize);
                scope.$watch("ngDisabled", toggle);
            };

            element.selectize(config);

            element.on("$destroy", function () {
                if (selectize) {
                    selectize.destroy();
                    element = null;
                }
            });
        }
    };
}]);
