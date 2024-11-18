sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
],
  function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("zassist.zassistchat.controller.main", {

      onInit: function () {
        const oUiModel = new JSONModel(this._getInitialUiModel());
        this.getView().setModel(oUiModel, "ui");
      },

      _getInitialUiModel: function () {
        return {
          enabledButton: false,
          enabledDelButton: false,
          sendBtnEnabled: false,
          textAreaEditable: false,
          attachEnabled: true,
          attachFileEnabled: true,
          busy: false,
          predefinedQuestionsVisible: true,
          selectedFiles: [],
          fileUrl: "",
          summary: {
            txtInput: "",
            txtSummary: "",
          },
          chatbot: {
            txtInput: "",
            messages: [
              {
                role: "system",
                content: "You are a helpful AI Assistant who can help user queries about SAP technologies. Graciously to answer questions that are not related to SAP."
              },
              {
                role: "assistant",
                content: "<p>Hello, I am your Chatbot. How can I help you?</p>",
              }
            ],
          }
        };
      },

      onAfterRendering: function () {
        this.loadShowdownLibrary();
        this.addKeyboardEventsToInput();
        this._focusRemove();
      },

      loadShowdownLibrary: function () {
        const showdownUrl = "https://cdn.jsdelivr.net/npm/showdown@1.9.1/dist/showdown.min.js";

        return new Promise((resolve, reject) => {
          if (window.showdown) {
            this.converter = new showdown.Converter();
            resolve();
            return;
          }

          const script = document.createElement("script");
          script.src = showdownUrl;
          script.async = true;
          script.onload = () => {
            if (window.showdown) {
              this.converter = new showdown.Converter();
              resolve();
            } else {
              reject(new Error("showdown is not initialized"));
            }
          };
          script.onerror = () => reject(new Error("Failed to load showdown library"));
          document.head.appendChild(script);
        }).catch(error => {
          console.error("Failed to load showdown library", error);
        });
      },

      onTxtInputTextAreaLiveChange: function (oEvent) {
        var sValue = oEvent.getParameter("value").trim();
        var oUiModel = this.getView().getModel("ui");
        var aSelectedFilesLength = oUiModel.getProperty("/selectedFiles").length;

        if (aSelectedFilesLength) {
          oUiModel.setProperty("/sendBtnEnabled", true);
        } else {
          oUiModel.setProperty("/sendBtnEnabled", !!sValue);
        }
      },

      _focusRemove: function () {
        var oUiModel = this.getView().getModel("ui");
        var oButton = this.getView().byId("idFileUploader");

        oButton.setEnabled(false);
        setTimeout(function () {
          oButton.setEnabled(true);
          oUiModel.setProperty("/enabledButton", true);
          oUiModel.setProperty("/textAreaEditable", true);
        }, 0);
      },

      addKeyboardEventsToInput: function () {
        var oInput = this.getView().byId("idTxtInputTextArea");
        var oUiModel = this.getView().getModel("ui");

        oInput.attachBrowserEvent("keydown", function (oEvent) {
          if (oEvent.key === "Enter" && (oEvent.ctrlKey || oEvent.metaKey)) {
            var sValue = oInput.getValue().trim();
            if (sValue) {
              oUiModel.setProperty("/chatbot/txtInput", sValue);
              this.onButtonSendPress();
              oInput.setValue("");
              oEvent.preventDefault();
            }
          }
        }.bind(this));
      },

      onFileUploaderChange: function (oEvent) {
        var aFiles = oEvent.getParameter("files");
        var oUiModel = this.getView().getModel("ui");
        var aSelectedFiles = oUiModel.getProperty("/selectedFiles").slice();

        var aPromises = [];
        var bNewFilesAdded = false;

        if (aFiles && aFiles.length > 0) {
          Array.from(aFiles).forEach(function (oFile) {
            var sFileName = oFile.name;

            var bFileExists = aSelectedFiles.some(function (file) {
              return file.fileName === sFileName;
            });

            if (bFileExists) {
              sap.m.MessageToast.show("File with name '" + sFileName + "' has already been uploaded");
              return;
            }

            var oReader = new FileReader();

            var oPromise = new Promise(function (resolve) {
              oReader.onload = function (e) {
                var sFileUrl = e.target.result;
                aSelectedFiles.push({
                  fileName: sFileName,
                  fileUrl: sFileUrl
                });
                oUiModel.setProperty("/selectedFiles", aSelectedFiles);
                resolve();
              };
            });

            aPromises.push(oPromise);
            bNewFilesAdded = true;

            if (oFile.type === "application/pdf" || oFile.type === "text/plain" || oFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || oFile.type === "text/csv") {
              oReader.readAsDataURL(oFile); //Base64
            } else {
              sap.m.MessageToast.show("Unsupported file type: " + sFileName);
            }
          });

          if (bNewFilesAdded) {
            Promise.all(aPromises).then(function () {

              oUiModel.setProperty("/sendBtnEnabled", true);

              if (aSelectedFiles.length === 1) {
                sap.m.MessageToast.show("File ready: " + aSelectedFiles[0].fileName);
              } else {
                sap.m.MessageToast.show("All files are ready");
              }
            })
          };

          oUiModel.setProperty("/attachFileEnabled", true);

          var oFileUploader = oEvent.getSource();
          oFileUploader.clear();
        }
      },

      onFileNameLinkPress: function (oEvent) {
        var oBindingContext = oEvent.getSource().getBindingContext("ui");
        var sFileUrl = oBindingContext.getProperty("fileUrl");
        var sFileName = oBindingContext.getProperty("fileName");

        if (sFileUrl && sFileName) {
          var oLink = document.createElement('a');
          oLink.href = sFileUrl;
          oLink.download = sFileName;
          oLink.style.display = 'none';
          document.body.appendChild(oLink);
          oLink.click();
          document.body.removeChild(oLink);
        } else {
          sap.m.MessageToast.show("No file available for download");
        }
      },

      onButtonRemoveAttachmentPress: function (oEvent) {
        var oUiModel = this.getView().getModel("ui");
        var sFileName = oEvent.getSource().getBindingContext("ui").getProperty("fileName");
        var aSelectedFiles = oUiModel.getProperty("/selectedFiles").slice();
        var txtInput = oUiModel.getProperty("/chatbot/txtInput");

        if (sFileName) {
          var aUpdatedFiles = aSelectedFiles.filter(function (file) {
            return file.fileName !== sFileName;
          });

          oUiModel.setProperty("/selectedFiles", aUpdatedFiles);

          if (aUpdatedFiles.length === 0 && !txtInput) {
            oUiModel.setProperty("/sendBtnEnabled", false);
          }

          sap.m.MessageToast.show("Attachment removed: " + sFileName);
        } else {
          sap.m.MessageToast.show("Error: File name is null or undefined.");
        }
      },

      _setBtnEnabled: function () {
        var oUiModel = this.getView().getModel("ui");

        oUiModel.setProperty("/sendBtnEnabled", true);
        oUiModel.setProperty("/attachEnabled", true);
        oUiModel.setProperty("/attachFileEnabled", true);
        oUiModel.setProperty("/enabledButton", true);
        oUiModel.setProperty("/textAreaEditable", true);
        oUiModel.setProperty("/busy", false);
      },

      // _deleteUploadedFiles: function () {
      //   var that = this;

      //   $.ajax({
      //     url: "https://ragu-emlliano-turbulent-cat-mk.cfapps.us10-001.hana.ondemand.com/api/files",
      //     method: "DELETE",
      //     contentType: "application/json",
      //     data: JSON.stringify({ deleteAll: true }),
      //     success: function (oResData) {
      //       that._deleteEmbedDocuments();
      //     },
      //     error: function (error) { }
      //   });
      // },

      // _deleteEmbedDocuments: function () {
      //   $.ajax({
      //     url: "https://ragu-emlliano-turbulent-cat-mk.cfapps.us10-001.hana.ondemand.com/api/embed_docs",
      //     method: "DELETE",
      //     contentType: "application/json",
      //     data: JSON.stringify({ deleteAll: true }),
      //     success: function (oResData) { },
      //     error: function (error) { }
      //   });
      // },

      _sendChatMessage: function () {
        var that = this;
        var oUiModel = this.getView().getModel("ui");
        var txtInput = oUiModel.getProperty("/chatbot/txtInput") || "";
        var aSelectedFiles = oUiModel.getProperty("/selectedFiles") || [];

        // var sUrl = "https://ragu-emlliano-turbulent-cat-mk.cfapps.us10-001.hana.ondemand.com/api/chat";
        var sUrl = "https://ai-assistant-backend.cfapps.us10-001.hana.ondemand.com/api/chat";

        $.ajax({
          url: sUrl,
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify({ q: txtInput }),
          success: function (resData) {

            var oUserMessage = {
              role: "user",
              content: txtInput,
              attachments: aSelectedFiles.length ? aSelectedFiles : []
            };

            var oMessages = oUiModel.getProperty("/chatbot/messages").concat([oUserMessage]);

            oUiModel.setProperty("/sendBtnEnabled", false);
            oUiModel.setProperty("/attachEnabled", true);
            oUiModel.setProperty("/attachFileEnabled", true);
            oUiModel.setProperty("/enabledButton", true);
            oUiModel.setProperty("/textAreaEditable", true);
            // oUiModel.setProperty("/busy", false);

            oUiModel.setProperty("/predefinedQuestionsVisible", false);

            if (that.converter) {
              var formattedContent = that.converter.makeHtml(resData.result);

              oMessages.push({
                role: "assistant",
                content: formattedContent
              });
            } else {
              oMessages.push({
                role: "assistant",
                content: resData.result
              });
            }

            oUiModel.setProperty("/chatbot/messages", oMessages);

            if (aSelectedFiles.length) {
              oUiModel.setProperty("/ui/attachments", aSelectedFiles);
            }

            oUiModel.setProperty("/chatbot/txtInput", "");
            oUiModel.setProperty("/selectedFiles", []);

            // that._deleteUploadedFiles();
          },
          error: function (error) {
            that._setBtnEnabled();

            sap.m.MessageToast.show("Error fetching data from the server. Please try again later.");
          },
          complete: function (resData) {
            oUiModel.setProperty("/busy", false);
            that._updateDeleteButtonState();
          }
        });
      },

      _convertToBlob: function (aSelectedFiles) {
        var formData = new FormData();

        aSelectedFiles.forEach(function (file) {

          if (file.fileUrl && file.fileUrl.includes(',')) {

            var byteString = atob(file.fileUrl.split(',')[1]);
            var mimeString = file.fileUrl.split(',')[0].split(':')[1].split(';')[0];


            var ab = new ArrayBuffer(byteString.length);
            var ia = new Uint8Array(ab);
            for (var i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }

            var blob = new Blob([ab], { type: mimeString });
            var newFile = new File([blob], file.fileName, { type: mimeString });

            formData.append("file", newFile);
          }
        });

        return formData;
      },

      _embedDocuments: function (aSelectedFiles) {
        var that = this;
        var oUiModel = this.getView().getModel("ui");
        var txtInput = oUiModel.getProperty("/chatbot/txtInput") || "";
        var aSelectedFilesLength = aSelectedFiles.length;

        if (txtInput) {
          oUiModel.setProperty("/textAreaEditable", false);
        }

        $.ajax({
          // url: "https://ragu-emlliano-turbulent-cat-mk.cfapps.us10-001.hana.ondemand.com/api/embed_docs",
          url: "https://ai-assistant-backend.cfapps.us10-001.hana.ondemand.com/api/embed_docs",
          method: "PUT",
          success: function (resData) {
            if (txtInput) {
              that._sendChatMessage();
            } else {

              var oUserMessage = {
                role: "user",
                content: "",
                attachments: aSelectedFiles.length ? aSelectedFiles : []
              };

              var oMessages = oUiModel.getProperty("/chatbot/messages").concat([oUserMessage]);

              oUiModel.setProperty("/chatbot/messages", oMessages);
              oUiModel.setProperty("/chatbot/txtInput", "");
              oUiModel.setProperty("/selectedFiles", []);

              if (aSelectedFilesLength) {
                oUiModel.setProperty("/ui/attachments", aSelectedFiles);
              }

              oUiModel.setProperty("/sendBtnEnabled", false);
              oUiModel.setProperty("/attachEnabled", true);
              oUiModel.setProperty("/attachFileEnabled", true);
              oUiModel.setProperty("/enabledButton", true);
              oUiModel.setProperty("/textAreaEditable", true);
              oUiModel.setProperty("/busy", false);

              if (aSelectedFilesLength === 1) {
                sap.m.MessageToast.show("The file was uploaded successfully");
              } else {
                sap.m.MessageToast.show("The files were uploaded successfully");
              }
            }
          },
          error: function (error) {
            if (aSelectedFilesLength > 1) {
              sap.m.MessageToast.show("Failed to send files. Please try again");
            } else {
              sap.m.MessageToast.show("Failed to send file. Please try again");
            }
            that._setBtnEnabled();
          },
          complete: function (resData) {
            that._updateDeleteButtonState();
          }
        });
      },

      _sendFilesForUpload: function (aSelectedFiles) {
        var that = this;
        var aSelectedFilesLength = aSelectedFiles.length;

        function uploadFile(index) {
          if (index >= aSelectedFilesLength) {
            that._embedDocuments(aSelectedFiles);
            return;
          }

          var formData = that._convertToBlob([aSelectedFiles[index]]);

          $.ajax({
            // url: "https://ragu-emlliano-turbulent-cat-mk.cfapps.us10-001.hana.ondemand.com/api/files",
            url: "https://ai-assistant-backend.cfapps.us10-001.hana.ondemand.com/api/files",
            method: "POST",
            data: formData,
            contentType: false,
            processData: false,
            success: function (uploadRes) {
              uploadFile(index + 1);
            }.bind(this),
            error: function (error) {
              if (aSelectedFilesLength > 1) {
                sap.m.MessageToast.show("Failed to send files. Please try again");
              } else {
                sap.m.MessageToast.show("Failed to send file. Please try again");
              }
              that._setBtnEnabled();
            }
          });
        }
        uploadFile(0);
      },

      onButtonSendPress: function () {
        var oUiModel = this.getView().getModel("ui");
        var aSelectedFiles = oUiModel.getProperty("/selectedFiles");

        oUiModel.setProperty("/busy", true);
        oUiModel.setProperty("/sendBtnEnabled", false);
        oUiModel.setProperty("/attachEnabled", false);
        oUiModel.setProperty("/attachFileEnabled", false);
        oUiModel.setProperty("/enabledButton", false);

        // If there are files to upload, handle file upload first
        if (aSelectedFiles.length > 0) {
          this._sendFilesForUpload(aSelectedFiles);
        } else {
          // If there are no files, just send the chat message
          oUiModel.setProperty("/textAreaEditable", false);
          this._sendChatMessage();
        }
      },

      onDeleteAllButtonPress: function () {
        var oUiModel = this.getView().getModel("ui");

        oUiModel.setData(this._getInitialUiModel());
        oUiModel.setProperty("/attachFileEnabled", true);
        oUiModel.setProperty("/predefinedQuestionsVisible", true);


        this._focusRemove();

        sap.m.MessageToast.show("All messages have been deleted");

        // oUiModel.setProperty("/chatbot/messages", []);
        // oUiModel.setProperty("/chatbot/txtInput", "");
        // oUiModel.setProperty("/selectedFiles", []);
        // oUiModel.setProperty("/sendBtnEnabled", false);

        // oUiModel.setProperty("/chatbot/messages", [
        //   {
        //     role: "system",
        //     content: "You are a helpful AI Assistant who can help user queries about SAP technologies. Graciously to answer questions that are not related to SAP."
        //   },
        //   {
        //     role: "assistant",
        //     content: "<p>Hello, I am your Chatbot. How can I help you?</p>",
        //   }
        // ]);
      },

      onPredefinedQuestionPress: function (oEvent) {
        var sQuestion = oEvent.getSource().getText();
        var oUiModel = this.getView().getModel("ui");

        oUiModel.setProperty("/chatbot/txtInput", sQuestion);
        oUiModel.setProperty("/sendBtnEnabled", true);
      },

      _updateDeleteButtonState: function () {
        var oUiModel = this.getView().getModel("ui");
        var aMessages = oUiModel.getProperty("/chatbot/messages");
        var bHasMessages = aMessages && aMessages.length > 2;

        oUiModel.setProperty("/enabledDelButton", bHasMessages);
      }
    })
  })