(function () {

  var CKEDITOR_NAME = 'pasteUploadImage';

  CKEDITOR.plugins.add(CKEDITOR_NAME, {
    requires: "pastetools,uploadwidget",
    init: function(editor) {
      var fileTools = CKEDITOR.fileTools,
          uploadUrl = fileTools.getUploadUrl(editor.config, 'image') || '';
      if (!uploadUrl) return;
      var ckCsrfToken = CKEDITOR.tools.getCsrfToken();
      var config = editor.config;
      var path = this.path;
      var pastetoolsPath = CKEDITOR.plugins.getPath( 'pastetools' );
      var defaultFilters = [
        CKEDITOR.getUrl( pastetoolsPath + 'filter/common.js' ),
        CKEDITOR.getUrl( pastetoolsPath + 'filter/image.js' ),
        CKEDITOR.getUrl( path + 'filter/default.js' )
      ];
      var configInlineImages = editor.config.pasteFromWord_inlineImages === undefined ? true : editor.config.pasteFromWord_inlineImages;

      editor.pasteTools.register( {
        filters: editor.config.pasteFromWordCleanupFile ? [ editor.config.pasteFromWordCleanupFile ] :
          defaultFilters,

        canHandle: function( evt ) {
          var data = evt.data,
            // Always get raw clipboard data (#3586).
            mswordHtml = CKEDITOR.plugins.pastetools.getClipboardData( data, 'text/html' ),
            generatorName = CKEDITOR.plugins.pastetools.getContentGeneratorName( mswordHtml ),
            wordRegexp = /(class="?Mso|style=["'][^"]*?\bmso\-|w:WordDocument|<o:\w+>|<\/font>)/,
            // Use wordRegexp only when there is no meta generator tag in the content
            isOfficeContent = generatorName ? generatorName === 'microsoft' : wordRegexp.test( mswordHtml );

          return mswordHtml && ( forceFromWord || isOfficeContent );
        },

        handle: function( evt, next ) {
          var data = evt.data,
            mswordHtml = CKEDITOR.plugins.pastetools.getClipboardData( data, 'text/html' ),
            // Required in Paste from Word Image plugin (#662).
            dataTransferRtf = CKEDITOR.plugins.pastetools.getClipboardData( data, 'text/rtf' ),
            pfwEvtData = { dataValue: mswordHtml, dataTransfer: { 'text/rtf': dataTransferRtf } };

          // PFW might still get prevented, if it's not forced.
          if ( editor.fire( 'pasteFromWord', pfwEvtData ) === false && !forceFromWord ) {
            return;
          }

          // Do not apply paste filter to data filtered by the Word filter (https://dev.ckeditor.com/ticket/13093).
          data.dontFilter = true;

          if ( forceFromWord || confirmCleanUp() ) {
            pfwEvtData.dataValue = CKEDITOR.cleanWord( pfwEvtData.dataValue, editor );

            // Paste From Word Image:
            // RTF clipboard is required for embedding images.
            // If img tags are not allowed there is no point to process images.
            // Also skip embedding images if image filter is not loaded.
            if ( CKEDITOR.plugins.clipboard.isCustomDataTypesSupported && configInlineImages &&
              CKEDITOR.pasteFilters.image ) {
              pfwEvtData.dataValue = CKEDITOR.pasteFilters.image( pfwEvtData.dataValue, editor, dataTransferRtf );
            }

            editor.fire( 'afterPasteFromWord', pfwEvtData );

            data.dataValue = pfwEvtData.dataValue;

            if ( editor.config.forcePasteAsPlainText === true ) {
              // If `config.forcePasteAsPlainText` set to true, force plain text even on Word content (#1013).
              data.type = 'text';
            } else if ( !CKEDITOR.plugins.clipboard.isCustomCopyCutSupported && editor.config.forcePasteAsPlainText === 'allow-word' ) {
              // In browsers using pastebin when pasting from Word, evt.data.type is 'auto' (not 'html') so it gets converted
              // by 'pastetext' plugin to 'text'. We need to restore 'html' type (#1013) and (#1638).
              data.type = 'html';
            }
          }

          // Reset forceFromWord.
          forceFromWord = 0;

          next();

          function confirmCleanUp() {
            return !editor.config.pasteFromWordPromptCleanup ||
              confirm( editor.lang.pastefromword.confirmCleanup );
          }
        }
      } );
      fileTools.addUploadWidget(editor, "pasteUploadImage", {
        supportedTypes: /image\/(jpeg|png|gif|bmp)/,
        uploadUrl: uploadUrl,
        fileToElement: function () {
          var img = new CKEDITOR.dom.element("img");
          img.setAttribute("src", loadingImage);
          return img
        },
        parts: {
          img: "img"
        },
        onUploading: function (upload) {
          this.parts.img.setAttribute("src", upload.data)
        },
        onUploaded: function (upload) {
          var $img = this.parts.img.$;
          this.replaceWith('<img src="' + upload.url + '" ' + '">')
        }
      });

      // var notSupportText = 'Your browser is not supported';
      // if (!window.Promise || !window.XMLHttpRequest) {
      //   alert(notSupportText);
      //   return;
      // }
      //
      // if (!config.pasteUploadFileApi) {
      //   CKEDITOR.error('You must to config "config.pasteUploadFileApi" in ckeditor/config.js');
      //   return;
      // }

      editor.on('paste', function (evt) {
        var data = evt.data,
          mswordHtml = evt.data.dataTransfer.getData('text/html', true),
          // Required in Paste from Word Image plugin (#662).
          dataTransferRtf = evt.data.dataTransfer.getData('text/rtf', true),
          pfwEvtData = { dataValue: mswordHtml, dataTransfer: { 'text/rtf': dataTransferRtf } };

        // PFW might still get prevented, if it's not forced.
        if ( editor.fire( 'pasteFromWord', pfwEvtData ) === false && !forceFromWord ) {
          return;
        }
        // Do not apply paste filter to data filtered by the Word filter (https://dev.ckeditor.com/ticket/13093).
        data.dontFilter = true;

        if ( forceFromWord || confirmCleanUp() ) {
          pfwEvtData.dataValue = CKEDITOR.cleanWord( pfwEvtData.dataValue, editor );

          // Paste From Word Image:
          // RTF clipboard is required for embedding images.
          // If img tags are not allowed there is no point to process images.
          // Also skip embedding images if image filter is not loaded.
          if ( CKEDITOR.plugins.clipboard.isCustomDataTypesSupported && configInlineImages &&
            CKEDITOR.pasteFilters.image ) {
            pfwEvtData.dataValue = CKEDITOR.pasteFilters.image( pfwEvtData.dataValue, editor, dataTransferRtf );
            console.log(pfwEvtData.dataValue);
          }

          editor.fire( 'afterPasteFromWord', pfwEvtData );

          data.dataValue = pfwEvtData.dataValue;
          // if ( editor.config.forcePasteAsPlainText === true ) {
          //   // If `config.forcePasteAsPlainText` set to true, force plain text even on Word content (#1013).
          //   data.type = 'text';
          // } else if ( !CKEDITOR.plugins.clipboard.isCustomCopyCutSupported && editor.config.forcePasteAsPlainText === 'allow-word' ) {
          //   // In browsers using pastebin when pasting from Word, evt.data.type is 'auto' (not 'html') so it gets converted
          //   // by 'pastetext' plugin to 'text'. We need to restore 'html' type (#1013) and (#1638).
          //   data.type = 'html';
          // }

          var data = evt.data,
            // Prevent XSS attacks.
            tempDoc = document.implementation.createHTMLDocument(''),
            temp = new CKEDITOR.dom.element(tempDoc.body),
            imgs, img, i;

          // Without this isReadOnly will not works properly.
          temp.data('cke-editable', 1);

          temp.appendHtml(data.dataValue);

          imgs = temp.find('img');

          for (i = 0; i < imgs.count(); i++) {
            img = imgs.getItem(i);

            // Image have to contain src=data:...
            var isDataInSrc = img.getAttribute('src') && img.getAttribute('src').substring(0, 5) == 'data:',
              isRealObject = img.data('cke-realelement') === null;
console.log(img.getAttribute('src'));
            // We are not uploading images in non-editable blocs and fake objects (http://dev.ckeditor.com/ticket/13003).
            if (isDataInSrc && isRealObject && !img.data('cke-upload-id') && !img.isReadOnly(1)) {
              var loader = editor.uploadRepository.create(img.getAttribute('src'));
              loader.upload(uploadUrl);

              fileTools.markElement(img, 'pasteimage', loader.id);

              fileTools.bindNotifications(editor, loader);
            }
          }

          data.dataValue = temp.getHtml();
        }
        // debugger
        // var dataTransfer = event.data.dataTransfer;
        // var filesCount = dataTransfer.getFilesCount();
//         var oldUrl = event.data.dataValue;
//         // base64 paste from word
//         if (oldUrl.match(/<img[\s\S]+data:/i)) {
//           return;
//         }
//         // 去重一些src data-src等造成的重复图片
//         var urls = uniq(oldUrl.match(/(?<=img.*?[\s]src=")[^"]+(?=")/gi));
// console.log(event);
// console.log(event.data);
//
// console.log(event.data.dataTransfer.getData('text/html', true));
//         var data = event.data,
//           tempDoc = document.implementation.createHTMLDocument(''),
//           temp = new CKEDITOR.dom.element(tempDoc.body),
//           imgs, img;
//
//         // Without this isReadOnly will not works properly.
//         temp.data('cke-editable', 1);
// console.log(data.dataValue);
//         temp.appendHtml(data.dataValue);
//
//         imgs = temp.find('img');
//         console.log(imgs);
//         if (urls.length) {
//           for (var i = 0; i < urls.length; i++) {
//             img = imgs.getItem(i);
//             console.log(img.getAttribute('src'));
//             var isDataInSrc = img.getAttribute('src') && img.getAttribute('src').substring(0, 5) == 'data:',
//               isRealObject = img.data('cke-realelement') === null;
//             uploadImageUrl(urls[i]);
//           }
//         }
        // if (filesCount > 0) {
        //   for (var i = 0; i < filesCount; i++) {
        //     var file = dataTransfer.getFile(i);
        //     // 网页复制单个
        //     if (urls.length) {
        //       modal(urls[0]);
        //       uploadFile(urls[0], urls[0], file);
        //     }
        //     //本地imagename.png
        //     else {
        //       if (!window.URL || !window.URL.createObjectURL) {
        //         alert(notSupportText);
        //         return;
        //       }
        //       var modalUrl = window.URL.createObjectURL(file);
        //       var isCreateImage = true;
        //       modal(modalUrl);
        //       uploadFile(oldUrl, modalUrl, file, isCreateImage)
        //     }
        //   }
        // } else {
        //   // 网页上传URL
        //   if (urls.length) {
        //     for (var i = 0; i < urls.length; i++) {
        //       modal(urls[i]);
        //       uploadImageUrl(urls[i]);
        //     }
        //   }
        // }
      });

      function confirmCleanUp() {
        return !editor.config.pasteFromWordPromptCleanup ||
          confirm( editor.lang.pastefromword.confirmCleanup );
      }
      
      function uploadFile (oldUrl, modalUrl, file, isCreateImage) {
        var formData = new FormData();
        formData.append('upload', file);
        var option = {
          url: config.pasteUploadFileApi,
          data: formData
        };
        ajaxPost(option).then(function (text) {
          if (text === 'request time out') {
            updateEditorVal(oldUrl, text, isCreateImage);
            updateModal(modalUrl, text);
            return;
          }
          
          // 接口回调URL
          var newUrl = text;
          updateEditorVal(oldUrl, newUrl, isCreateImage);
          updateModal(modalUrl, true);
        }).catch(function () {
          updateModal(oldUrl, false);
          updateEditorVal(modalUrl, 'failure');
        });
      }

      function uploadImageUrl (oldUrl) {
        var formData = new FormData();
        var file = new Image();
        file.src = oldUrl;
        console.log(file);
        // debugger
        formData.append('upload', file);
        formData.append('uploadMode', 'paste');
        formData.append('ckCsrfToken', ckCsrfToken);
        var option = {
          url: uploadUrl,
          data: formData
        };
        ajaxPost(option).then(function (text) {
          if (text === 'request time out') {
            updateEditorVal(oldUrl, text);
            // updateModal(oldUrl, text);
            return;
          }
          var newUrl = text;
          // updateModal(oldUrl, true);
          updateEditorVal(oldUrl, newUrl);
        }).catch(function () {
          // updateModal(oldUrl, false);
          updateEditorVal(oldUrl, 'failure');
        });
      }

      function ajaxPost (option) {
        var timeout = 10000;
        var xhr = new XMLHttpRequest();
        var p = new Promise(function (resolve, reject) {
          option = option || {};
          xhr.open('post', option.url);
          xhr.send(option.data);
          xhr.onreadystatechange = function() {
            if(xhr.readyState === 4 && xhr.status == 200) {
              var text =  xhr.responseText || '{}';
              var data = JSON.parse(text);
              if (data.url) {
                resolve(data.url);
              } else {
                // 没有返回图片链接则reject
                reject();
              }
              xhr = null;
            } 
            else if (xhr.readyState === 4 && xhr.status !== 200) {
              reject();
              xhr = null;
            }
          }
        });
        var t = new Promise(function(resolve) {
          var t = setTimeout(function () {
            if (xhr) {
              xhr && xhr.abort();
              resolve('request time out');
              clearTimeout(t);
            }
          }, timeout);
        });
        return Promise.race([p, t]);
      }

      function modal (filename) {
        var html = 
          '<div class="modal-editor-upload" filename="{{filename}}" style="margin-bottom: 5px;border-bottom: 1px solid #ddd;padding-bottom: 5px;">'+
            '<img style="width:40px;height:40px;vertical-align: middle;" src="{{filename}}"/>'+
            '<label style="color:green;"> uploading...</label>'+
          '</div>';
        html = html.replace(/\{\{(.+?)\}\}/g, filename);
        var wrapper = document.querySelector('.modal-editor-upload-wrapper');
        if (!wrapper) {
          var wrapper = document.createElement('div');
          wrapper.className = 'modal-editor-upload-wrapper';
          wrapper.style.cssText = 'width:200px;background-color:#fdfdfd;position:absolute;right: 30px;top: 100px;'
          wrapper.innerHTML = html;
          var edi = document.getElementById('cke_' + editor.name);
          edi.appendChild(wrapper);
          edi.style.position = 'relative';
        } else {
          wrapper.innerHTML += html;
        }
      }
  
      function updateModal (filename, result) {
        filename = filename.replace(/&amp;/g, '&');
        var selector = 'div.modal-editor-upload[filename="'+filename+'"]';
        var content = document.querySelector(selector);
        var label = content.querySelector('label');
        if (result === 'request time out') {
          label.innerHTML = ' ' + result;
          label.style.color = 'red';
        } else if (result === true) {
          label.innerHTML = ' success';
          label.style.color = 'green';
        } else {
          label.innerHTML = ' failure';
          label.style.color = 'red';
        }
        var time = result === true ? 3000 : 10000;
        var t = setTimeout(function () {
          var c = document.querySelector(selector);
          document.querySelector('.modal-editor-upload-wrapper').removeChild(c);
          clearTimeout(t);
        }, time);
      }

       // 更新
       function updateEditorVal (oldUrl, newUrl, isCreateImage) {
        var data = editor.getData();
        if (isCreateImage) {
          if (!oldUrl) {
            data = data + '<p><img src="'+newUrl+'"/></p>';
          } else {
            data = data.replace(oldUrl, '<img src="'+newUrl+'"/>');
          }
        } else {
          data = replaceAll(data, oldUrl, newUrl);
        }
        editor.document.$.body.innerHTML = data;
      }

      function uniq (arr) {
        arr = arr || [];
        var list = [];
        for (var i = 0; i < arr.length; i++) {
          if (list.indexOf(arr[i]) < 0) {
            list.push(arr[i]);
          }
        }
        return list;
      }

      function escapeRegExp(str) {
        return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
      }
    
      function replaceAll(str, find, replace) {
        return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
      }

    }
  });

  // Reset forceFromWord.
  var forceFromWord = 0;
})();