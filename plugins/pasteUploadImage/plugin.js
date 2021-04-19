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
        filters: editor.config.pasteFromWordCleanupFile ? [ editor.config.pasteFromWordCleanupFile ] : defaultFilters,

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
      });
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

      editor.on('paste', function (evt) {
        var data = evt.data,
        // Always get raw clipboard data (#3586).
        mswordHtml = CKEDITOR.plugins.pastetools.getClipboardData( data, 'text/html' ),
        generatorName = CKEDITOR.plugins.pastetools.getContentGeneratorName( mswordHtml ),
        wordRegexp = /(class="?Mso|style=["'][^"]*?\bmso\-|w:WordDocument|<o:\w+>|<\/font>)/,
        // Use wordRegexp only when there is no meta generator tag in the content
        isOfficeContent = generatorName ? generatorName === 'microsoft' : wordRegexp.test( mswordHtml );

        if (!(mswordHtml && ( forceFromWord || isOfficeContent ))) return;

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
          }

          editor.fire( 'afterPasteFromWord', pfwEvtData );

          data.dataValue = pfwEvtData.dataValue;

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
      });

      function confirmCleanUp() {
        return !editor.config.pasteFromWordPromptCleanup || confirm(editor.lang.pastefromword.confirmCleanup);
      }
    }
  });

  // Reset forceFromWord.
  var forceFromWord = 0;
})();