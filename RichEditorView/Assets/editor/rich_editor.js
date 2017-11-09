/**
 * Copyright (C) 2015 Wasabeef
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";

var RE = {};

//当前样式数量
RE.currentFmtCount;

RE.contentHeight = 244;

RE.titleEditor = document.getElementById('title');
RE.separatorDiv = document.getElementById('separatorDiv');

window.onload = function() {
    RE.callback("ready");
};

RE.editor = document.getElementById('editor');

// Not universally supported, but seems to work in iOS 7 and 8
document.addEventListener("selectionchange", function(e) {
                          RE.backuprange();
                          RE.replaceDIVNode();
//                          RE.calculateEditorHeightWithCaretPosition();
                          RE.enableEditingItems(e);
                          });

RE.editor.addEventListener("touchend", function(e) {
                            RE.enableEditingItems(e);
                     });
RE.editor.addEventListener("touchmove", function(e) {
                           RE.enableEditingItems(e);
                       });

//looks specifically for a Range selection and not a Caret selection
RE.rangeSelectionExists = function() {
    //!! coerces a null to bool
    var sel = document.getSelection();
    if (sel && sel.type == "Range") {
        return true;
    }
    return false;
};

RE.rangeOrCaretSelectionExists = function() {
    //!! coerces a null to bool
    var sel = document.getSelection();
    if (sel && (sel.type == "Range" || sel.type == "Caret")) {
        return true;
    }
    return false;
};

RE.editor.addEventListener("input", function(e) {
                           setTimeout(function() {RE.replaceDIVNode();}, 0)
                           RE.updatePlaceholder();
                           RE.backuprange();
                           RE.enableEditingItems(e);
                           RE.callback("input");
                           });

RE.editor.addEventListener("focus", function(e) {
                           RE.backuprange();
                           RE.enableEditingItems(e);
                           RE.callback("focus");
                           RE.callback("enableBar");
                           });

RE.editor.addEventListener("blur", function() {
                           RE.callback("blur");
                           });

RE.replaceDIVNode = function() {
    var current_selection = $(RE.getSelectedNode());
    if (current_selection) {
        var t = current_selection.prop("tagName").toLowerCase();
        if (t == 'div') document.execCommand('formatBlock', false, '<p>');
    }
}

RE.customAction = function(action) {
    RE.callback("action/" + action);
};

RE.updateHeight = function() {
    RE.callback("updateHeight");
}

RE.callbackQueue = [];
RE.runCallbackQueue = function() {
    if (RE.callbackQueue.length === 0) {
        return;
    }
    
    setTimeout(function() {
               window.location.href = "re-callback://";
               }, 0);
};

RE.getCommandQueue = function() {
    var commands = JSON.stringify(RE.callbackQueue);
    RE.callbackQueue = [];
    return commands;
};

RE.callback = function(method) {
    RE.callbackQueue.push(method);
    RE.runCallbackQueue();
};

RE.setHtml = function(contents) {
    var tempWrapper = document.createElement('div');
    tempWrapper.innerHTML = contents;
    var images = tempWrapper.querySelectorAll("img");
    
    for (var i = 0; i < images.length; i++) {
        images[i].onload = RE.updateHeight;
    }
    
    RE.editor.innerHTML = tempWrapper.innerHTML;
    RE.updatePlaceholder();
};

RE.getHtml = function() {
    return RE.editor.innerHTML;
};

RE.getText = function() {
    return RE.editor.innerText;
};

RE.setPlaceholderText = function(text) {
    RE.editor.setAttribute("placeholder", text);
};

RE.updatePlaceholder = function() {
    if (RE.editor.textContent.length > 0) {
        RE.editor.classList.remove("placeholder");
    } else {
        RE.editor.classList.add("placeholder");
    }
};

RE.removeFormat = function() {
    document.execCommand('removeFormat', false, null);
    RE.enableEditingItems();
};

RE.setFontSize = function(size) {
    RE.editor.style.fontSize = size;
};

RE.setBackgroundColor = function(color) {
    RE.editor.style.backgroundColor = color;
};

RE.setHeight = function(size) {
    RE.editor.style.height = size;
};

RE.undo = function() {
    document.execCommand('undo', false, null);
    RE.enableEditingItems();
};

RE.redo = function() {
    document.execCommand('redo', false, null);
    RE.enableEditingItems();
};

RE.setBold = function() {
    if (RE.isCommandEnabled('bold')) {
        document.execCommand('bold', false, null);
        document.execCommand('insertHTML', false, '&zwnj;');
    } else {
        document.execCommand('bold', false, null);
    }
    RE.enableEditingItems();
};

RE.setItalic = function() {
    if (RE.isCommandEnabled('italic')) {
        document.execCommand('italic', false, null);
        document.execCommand('insertHTML', false, '&zwnj;');
    } else {
        document.execCommand('italic', false, null);
    }
    RE.enableEditingItems();
};

RE.setSubscript = function() {
    document.execCommand('subscript', false, null);
    RE.enableEditingItems();
};

RE.setSuperscript = function() {
    document.execCommand('superscript', false, null);
    RE.enableEditingItems();
};

RE.setStrikeThrough = function() {
    document.execCommand('strikeThrough', false, null);
    RE.enableEditingItems();
};

RE.setUnderline = function() {
    document.execCommand('underline', false, null);
    RE.enableEditingItems();
};

RE.setTextColor = function(color) {
    RE.restorerange();
    document.execCommand("styleWithCSS", null, true);
    document.execCommand('foreColor', false, color);
    document.execCommand("styleWithCSS", null, false);
    RE.enableEditingItems();
};

RE.setTextBackgroundColor = function(color) {
    RE.restorerange();
    document.execCommand("styleWithCSS", null, true);
    document.execCommand('hiliteColor', false, color);
    document.execCommand("styleWithCSS", null, false);
    RE.enableEditingItems();
};

RE.setHeading = function(heading) {
    RE.removeEditorState('h3');
    var current_selection = $(RE.getSelectedNode());
    var isObj = RE.isNode(heading, current_selection);
    var t = isObj[1].prop("tagName").toLowerCase();
    var is_heading = (t == 'h1' || t == 'h2' || t == 'h3' || t == 'h4' || t == 'h5' || t == 'h6');
    if (is_heading && isObj[0]) {
        var c = isObj[1].html();
        isObj[1].replaceWith(c);
        RE.focus();
    } else {
        document.execCommand('formatBlock', false, '<'+heading+'>');
    }
    RE.enableEditingItems();
};

RE.setIndent = function() {
    document.execCommand('indent', false, null);
    RE.enableEditingItems();
};

RE.setOutdent = function() {
    document.execCommand('outdent', false, null);
    RE.enableEditingItems();
};

RE.setOrderedList = function() {
    document.execCommand('insertOrderedList', false, null);
    RE.enableEditingItems();
};

RE.setUnorderedList = function() {
    RE.removeEditorState('unorderedList');
    document.execCommand('insertUnorderedList', false, null);
    RE.enableEditingItems();
};

RE.setJustifyLeft = function() {
    document.execCommand('justifyLeft', false, null);
    RE.enableEditingItems();
};

RE.setJustifyCenter = function() {
    document.execCommand('justifyCenter', false, null);
    RE.enableEditingItems();
};

RE.setJustifyRight = function() {
    document.execCommand('justifyRight', false, null);
    RE.enableEditingItems();
};

RE.getLineHeight = function() {
    return RE.editor.style.lineHeight;
};

RE.setLineHeight = function(height) {
    RE.editor.style.lineHeight = height;
};

RE.insertImage = function(url, alt,id) {
    
    var span = document.createElement("span");
    span.id = id;
    span.className = "img_container"
    
    var progress = document.createElement("progress");
    progress.id = id + "_progress";
    progress.value = 0;
    progress.className = "wp_media_indicator";
    
    var img = document.createElement('img');
    img.setAttribute("src", url);
    img.setAttribute("alt", alt);
    img.id = id + "_img";
    img.style.opacity = 0.7;
    img.onload = RE.updateHeight;
    
    span.appendChild(img);
    span.appendChild(progress);
    
    RE.insertHTML(span.outerHTML);
    
//    RE.insertHTML(img.outerHTML);
    RE.callback("input");
};

RE.updateImageProgress = function(prd,id) {
    console.log(prd);
    console.log(id);
    var progressId = id + "_progress";
    var progress = $("#" + progressId);
    progress.value = parseFloat(prd);
};

RE.imageUploadSuccess = function(id) {
    var progressId = id + "_progress";
    $("#" + progressId).remove();
    var image = document.getElementById(id + "_img");
    image.style.opacity = 1;
};

RE.setBlockquote = function() {
    RE.removeEditorState('blockquote');
    var current_selection = $(RE.getSelectedNode());
    var isObj = RE.isNode('blockquote', current_selection);
    if (isObj[0]) {
        var c = isObj[1].html();
        isObj[1].replaceWith(c);
        RE.focus();
    } else {
        document.execCommand('formatBlock', false, '<blockquote>');
    }
    RE.enableEditingItems();
};

RE.insertHTML = function(html) {
    RE.restorerange();
    document.execCommand('insertHTML', false, html);
    RE.enableEditingItems();
};

RE.insertLink = function(url, title) {
    RE.restorerange();
    var sel = document.getSelection();
    if (sel.toString().length !== 0) {
        if (sel.rangeCount) {
            
            var el = document.createElement("a");
            el.setAttribute("href", url);
            el.setAttribute("title", title);
            
            var range = sel.getRangeAt(0).cloneRange();
            range.surroundContents(el);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    } else {
        document.execCommand("insertHTML",false,"<a href='"+url+"'>"+title+"</a>");
    }
    RE.callback("input");
    RE.enableEditingItems();
};

RE.updateLink = function(url, title) {
    RE.restorerange();
    if (RE.currentEditingLink) {
        RE.currentEditingLink.href = url
        RE.currentEditingLink.innerText = title
    }
    RE.callback("input");
    RE.enableEditingItems();
}

RE.prepareInsert = function() {
    RE.backuprange();
    RE.enableEditingItems();
};

RE.backuprange = function() {
    var selection = window.getSelection();
    if (selection.rangeCount > 0) {
        var range = selection.getRangeAt(0);
        RE.currentSelection = {
            "startContainer": range.startContainer,
            "startOffset": range.startOffset,
            "endContainer": range.endContainer,
            "endOffset": range.endOffset
        };
    }
};

RE.addRangeToSelection = function(selection, range) {
    if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
    }
};

// Programatically select a DOM element
RE.selectElementContents = function(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    // this.createSelectionFromRange sel, range
    RE.addRangeToSelection(sel, range);
};

RE.restorerange = function() {
    var selection = window.getSelection();
    selection.removeAllRanges();
    var range = document.createRange();
    range.setStart(RE.currentSelection.startContainer, RE.currentSelection.startOffset);
    range.setEnd(RE.currentSelection.endContainer, RE.currentSelection.endOffset);
    selection.addRange(range);
};

RE.focus = function() {
    var range = document.createRange();
    range.selectNodeContents(RE.editor);
    range.collapse(false);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    RE.editor.focus();
};

RE.focusAtPoint = function(x, y) {
    var range = document.caretRangeFromPoint(x, y) || document.createRange();
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    RE.editor.focus();
};

RE.blurFocus = function() {
    RE.editor.blur();
};

/**
 Recursively search element ancestors to find a element nodeName e.g. A
 **/
var _findNodeByNameInContainer = function(element, nodeName, rootElementId) {
    if (element.nodeName == nodeName) {
        return element;
    } else {
        if (element.id === rootElementId) {
            return null;
        }
        _findNodeByNameInContainer(element.parentElement, nodeName, rootElementId);
    }
};

var isAnchorNode = function(node) {
    return ("A" == node.nodeName);
};

RE.getAnchorTagsInNode = function(node) {
    var links = [];
    
    while (node.nextSibling !== null && node.nextSibling !== undefined) {
        node = node.nextSibling;
        if (isAnchorNode(node)) {
            links.push(node.getAttribute('href'));
        }
    }
    return links;
};

RE.countAnchorTagsInNode = function(node) {
    return RE.getAnchorTagsInNode(node).length;
};

/**
 * If the current selection's parent is an anchor tag, get the href.
 * @returns {string}
 */
RE.getSelectedHref = function() {
    var href, sel;
    href = '';
    sel = window.getSelection();
    if (!RE.rangeOrCaretSelectionExists()) {
        return null;
    }
    
    var tags = RE.getAnchorTagsInNode(sel.anchorNode);
    //if more than one link is there, return null
    if (tags.length > 1) {
        return null;
    } else if (tags.length == 1) {
        href = tags[0];
    } else {
        var node = _findNodeByNameInContainer(sel.anchorNode.parentElement, 'A', 'editor');
        href = node.href;
    }
    
    return href ? href : null;
};

// Returns the cursor position relative to its current position onscreen.
// Can be negative if it is above what is visible
RE.getRelativeCaretYPosition = function() {
    var y = 0;
    var sel = window.getSelection();
    if (sel.rangeCount) {
        var range = sel.getRangeAt(0);
        var needsWorkAround = (range.startOffset == 0)
        /* Removing fixes bug when node name other than 'div' */
        // && range.startContainer.nodeName.toLowerCase() == 'div');
        if (needsWorkAround) {
            y = range.startContainer.offsetTop - window.pageYOffset;
        } else {
            if (range.getClientRects) {
                var rects=range.getClientRects();
                if (rects.length > 0) {
                    y = rects[0].top;
                }
            }
        }
    }
    
    return y;
};

//当前光标所在位置的样式回调
RE.enableEditingItems = function(event, type) {
    //    console.log('enabledEditingItems');
    var items = [];
    if(RE.isCommandEnabled('bold')) {
        items.push('bold');
    }
    if(RE.isCommandEnabled('italic')) {
        items.push('italic');
    }
    if(RE.isCommandEnabled('subscript')) {
        items.push('subscript');
    }
    if(RE.isCommandEnabled('superscript')) {
        items.push('superscript');
    }
    if(RE.isCommandEnabled('strikeThrough')) {
        items.push('strikeThrough');
    }
    if(RE.isCommandEnabled('underline')) {
        items.push('underline');
    }
    if (RE.isCommandEnabled('insertOrderedList')) {
        items.push('orderedList');
    }
    if (RE.isCommandEnabled('insertUnorderedList')) {
        items.push('unorderedList');
    }
    if (RE.isCommandEnabled('justifyCenter')) {
        items.push('justifyCenter');
    }
    if (RE.isCommandEnabled('justifyFull')) {
        items.push('justifyFull');
    }
    if (RE.isCommandEnabled('justifyLeft')) {
        items.push('justifyLeft');
    }
    if (RE.isCommandEnabled('justifyRight')) {
        items.push('justifyRight');
    }
    if (RE.isCommandEnabled('insertHorizontalRule')) {
        items.push('horizontalRule');
    }
    var formatBlock = document.queryCommandValue('formatBlock');
    
    if (formatBlock.length > 0) {
        items.push(formatBlock);
    }
    
    if (typeof(event) != "undefined") {
        // The target element
        var s = RE.getSelectedNode();
        var t = $(s);
        var nodeName = event.target.nodeName.toLowerCase();
        // Link
        if (nodeName == 'a') {
            RE.currentEditingLink = event.target;
            var title = event.target.innerHTML;
            if (title !== undefined) {
                items.push('link-title:'+title);
            }
            items.push('link:'+event.target.href);
        }
        
        // Blockquote
        if (nodeName == 'blockquote') {
            items.push('indent');
        }
        // Image
        if (nodeName == 'img') {
            RE.currentEditingImage = t;
            items.push('image:'+t.attr('src'));
            if (t.attr('alt') !== undefined) {
                items.push('image-alt:'+t.attr('alt'));
            }
            
        } else {
            RE.currentEditingImage = null;
        }
    }
    
    if (items.length > 0) {
        setTimeout(function() {
                   window.location.href = "callback://0/"+items.join(',');
                   }, 0);
    }
    RE.editorState = items;
    RE.currentFmtCount = items.length
    console.log(items);
}
RE.editorState = null;

RE.isCommandEnabled = function(commandName) {
    return document.queryCommandState(commandName);
}

RE.getSelectedNode = function() {
    var node,selection;
    if (window.getSelection) {
        selection = getSelection();
        node = selection.anchorNode;
    }
    if (!node && document.selection) {
        selection = document.selection
        var range = selection.getRangeAt ? selection.getRangeAt(0) : selection.createRange();
        node = range.commonAncestorContainer ? range.commonAncestorContainer :
        range.parentElement ? range.parentElement() : range.item(0);
    }
    if (node) {
        return (node.nodeName == "#text" ? node.parentNode : node);
    }
};

//移除多余的span标签
RE.removeSpanLabel = function() {
    var current_selection = $(RE.getSelectedNode());
    var t = current_selection.prop("tagName").toLowerCase();
    if (t == 'span') {
        var c = current_selection.html();
        current_selection.replaceWith(c);
    }
}

RE.isNode = function (heading, mNode) {
    var is = false, node;
    if (!oNode) var oNode = mNode;
    var re = function(p) {
        var $m = p,
        parent = $m.parent();
        if (!parent) {
            is =  heading == $m.prop("tagName").toLowerCase();
            node = $m;
            return;
        }
        var tagName = parent.prop('tagName').toLowerCase();
        if (tagName == heading) {
            is =  heading == parent.prop("tagName").toLowerCase();
            node = parent;
            return;
        }
        if (tagName == 'html') {
            is =  heading == oNode.prop("tagName").toLowerCase();
            node = oNode;
            return;
        }
        re(parent)
    }
    re(mNode)
    return [is, node];
}

RE.calculateEditorHeightWithCaretPosition = function() {
    
    var padding = 64;
    var c = RE.getCaretYPosition();
    
    var offsetY = window.document.body.scrollTop;
    var height = RE.contentHeight;
    
    var newPos = window.pageYOffset;
    if (c < offsetY) {
        newPos = c;
    } else if (c > (offsetY + height - padding)) {
        newPos = c - height + padding - 18;
    }
    window.scrollTo(0, newPos);
}

RE.getCaretYPosition = function() {
    var sel = window.getSelection();
    var range = sel.getRangeAt(0);
    var span = document.createElement('span');// something happening here preventing selection of elements
    range.collapse(false);
    range.insertNode(span);
    var topPosition = span.offsetTop;
    span.parentNode.removeChild(span);
    return topPosition;
}

RE.removeEditorState = function(type) {
    const states = ['blockquote', 'h3', 'unorderedList']
    let arithmetic = i => {
        RE.editorState
        .filter(item => item == i)
        .forEach(item => {
                 switch(item) {
                 case 'blockquote':
                 RE.setBlockquote();
                 break;
                 case 'h3':
                 RE.setHeading('h3');
                 break;
                 case 'unorderedList':
                 RE.setUnorderedList();
                 break;
                 }
                 });
    }
    states
    .filter(i => i != type)
    .forEach(i => {arithmetic(i)})
}

RE.displayTitle = function(display) {
   if (display) {
      RE.titleEditor.style.display = '';
      RE.separatorDiv.style.display = '';
      RE.titleEditor.focus();
   } else {
      RE.titleEditor.style.display = 'none';
      RE.separatorDiv.style.display = 'none';
      RE.focus();
   }
}

RE.titleEditor.addEventListener("keydown", function(e) {
   if (e.keyCode == 13) {
      e.stopPropagation();
      e.preventDefault();
      RE.focus();
  }
});

RE.titleEditor.addEventListener("input", function(e) {
  var show = e.target.innerHTML.replace(/^(<p>)(<br>)?<\/p>\s*$/ig, '');
  if (show) {
    e.target.setAttribute("placeholder", '');
  } else {
    e.target.setAttribute("placeholder", '请填写标题');
  }
});

RE.titleEditor.addEventListener("focus", function(e) {
  RE.callback("disableBar");
});
