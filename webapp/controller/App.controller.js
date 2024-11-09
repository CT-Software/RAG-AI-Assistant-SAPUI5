sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function(BaseController) {
      "use strict";
  
      return BaseController.extend("zassist.zassistchat.controller.App", {
        onInit: function() {
        },

        getModel: function (sName) {
          return this.getView().getModel(sName);
      },
      });
    }
  );
  