//
//  RichEditor.swift
//
//  Created by Caesar Wirth on 4/1/15.
//  Copyright (c) 2015 Caesar Wirth. All rights reserved.
//

import UIKit

/// RichEditorDelegate defines callbacks for the delegate of the RichEditorView
@objc public protocol RichEditorDelegate: class {

    /// Called when the inner height of the text being displayed changes
    /// Can be used to update the UI
    @objc optional func richEditor(_ editor: RichEditorView, heightDidChange height: Int)

    /// Called whenever the content inside the view changes
    @objc optional func richEditor(_ editor: RichEditorView, contentDidChange content: String)

    /// Called when the rich editor starts editing
    @objc optional func richEditorTookFocus(_ editor: RichEditorView)
    
    /// Called when the rich editor stops editing or loses focus
    @objc optional func richEditorLostFocus(_ editor: RichEditorView)
    
    /// Called when the RichEditorView has become ready to receive input
    /// More concretely, is called when the internal UIWebView loads for the first time, and contentHTML is set
    @objc optional func richEditorDidLoad(_ editor: RichEditorView)
    
    /// Called when the internal UIWebView begins loading a URL that it does not know how to respond to
    /// For example, if there is an external link, and then the user taps it
    @objc optional func richEditor(_ editor: RichEditorView, shouldInteractWith url: URL) -> Bool
    
    /// Called when custom actions are called by callbacks in the JS
    /// By default, this method is not used unless called by some custom JS that you add
    @objc optional func richEditor(_ editor: RichEditorView, handle action: String)
}

/// RichEditorView is a UIView that displays richly styled text, and allows it to be edited in a WYSIWYG fashion.
open class RichEditorView: UIView, UIScrollViewDelegate, UIWebViewDelegate, UIGestureRecognizerDelegate {

    // MARK: Public Properties

    /// The delegate that will receive callbacks when certain actions are completed.
    open weak var delegate: RichEditorDelegate?
    
    /// Input accessory view to display over they keyboard.
    /// Defaults to nil
    open override var inputAccessoryView: UIView? {
        get { return webView.cjw_inputAccessoryView }
        set { webView.cjw_inputAccessoryView = newValue }
    }

    /// The internal UIWebView that is used to display the text.
    open private(set) var webView: UIWebView
    
    // display title,default is false
    open var displayTitle = false

    /// Whether or not scroll is enabled on the view.
    open var isScrollEnabled: Bool = true {
        didSet {
            webView.scrollView.isScrollEnabled = isScrollEnabled
        }
    }

    /// Whether or not to allow user input in the view.
    open var isEditingEnabled: Bool {
        get { return isContentEditable }
        set { isContentEditable = newValue }
    }

    /// The content HTML of the text being displayed.
    /// Is continually updated as the text is being edited.
    open private(set) var contentHTML: String = "" {
        didSet {
            delegate?.richEditor?(self, contentDidChange: contentHTML)
        }
    }

    /// The internal height of the text being displayed.
    /// Is continually being updated as the text is edited.
    open private(set) var editorHeight: Int = 0 {
        didSet {
            delegate?.richEditor?(self, heightDidChange: editorHeight)
        }
    }
    
    open var barButtonItemDefaultColor:UIColor = UIColor(red: 139/255.0, green: 154/255.0, blue: 170/255.0, alpha: 1.0)
    open var barButtonItemSelectedDefaultColor:UIColor = UIColor(red: 59/255.0, green: 139/255.0, blue: 215/255.0, alpha: 1.0)
    private var editorItemsEnabled = [String]()

    /// The value we hold in order to be able to set the line height before the JS completely loads.
    private var innerLineHeight: Int = 28

    /// The line height of the editor. Defaults to 28.
    open private(set) var lineHeight: Int {
        get {
            if isEditorLoaded, let lineHeight = Int(runJS("RE.getLineHeight();")) {
                return lineHeight
            } else {
                return innerLineHeight
            }
        }
        set {
            innerLineHeight = newValue
            runJS("RE.setLineHeight('\(innerLineHeight)px');")
        }
    }

    // MARK: Private Properties

    /// Whether or not the editor has finished loading or not yet.
    private var isEditorLoaded = false

    /// Value that stores whether or not the content should be editable when the editor is loaded.
    /// Is basically `isEditingEnabled` before the editor is loaded.
    private var editingEnabledVar = true

    /// The private internal tap gesture recognizer used to detect taps and focus the editor
    private let tapRecognizer = UITapGestureRecognizer()

    /// The inner height of the editor div.
    /// Fetches it from JS every time, so might be slow!
    private var clientHeight: Int {
        let heightString = runJS("document.getElementById('editor').clientHeight;")
        return Int(heightString) ?? 0
    }

    // MARK: Initialization
    
    public override init(frame: CGRect) {
        webView = UIWebView()
        super.init(frame: frame)
        setup()
    }

    required public init?(coder aDecoder: NSCoder) {
        webView = UIWebView()
        super.init(coder: aDecoder)
        setup()
    }
    
    private func setup() {
        backgroundColor = .white
        
        webView.frame = bounds
        webView.delegate = self
        webView.keyboardDisplayRequiresUserAction = false
        webView.scalesPageToFit = false
        webView.isOpaque = false
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.dataDetectorTypes = UIDataDetectorTypes()
        webView.backgroundColor = .clear
        
        webView.scrollView.isScrollEnabled = isScrollEnabled
        webView.scrollView.bounces = false
        webView.scrollView.delegate = self
        webView.scrollView.clipsToBounds = false
        webView.clipsToBounds = false
        
        webView.cjw_inputAccessoryView = nil
        
        self.addSubview(webView)
        
        if let filePath = Bundle(for: RichEditorView.self).path(forResource: "rich_editor", ofType: "html") {
            let url = URL(fileURLWithPath: filePath, isDirectory: false)
            let request = URLRequest(url: url)
            webView.loadRequest(request)
        }

        tapRecognizer.addTarget(self, action: #selector(viewWasTapped))
        tapRecognizer.delegate = self
        addGestureRecognizer(tapRecognizer)
    }

    // MARK: - Rich Text Editing

    // MARK: Properties

    /// The HTML that is currently loaded in the editor view, if it is loaded. If it has not been loaded yet, it is the
    /// HTML that will be loaded into the editor view once it finishes initializing.
    public var html: String {
        get {
            return runJS("RE.getHtml();")
        }
        set {
            contentHTML = newValue
            if isEditorLoaded {
                runJS("RE.setHtml('\(newValue.escaped)');")
            }
        }
    }

    /// Text representation of the data that has been input into the editor view, if it has been loaded.
    public var text: String {
        return runJS("RE.getText()")
    }

    /// Private variable that holds the placeholder text, so you can set the placeholder before the editor loads.
    private var placeholderText: String = ""
    /// The placeholder text that should be shown when there is no user input.
    open var placeholder: String {
        get { return placeholderText }
        set {
            placeholderText = newValue
            runJS("RE.setPlaceholderText('\(newValue.escaped)');")
        }
    }


    /// The href of the current selection, if the current selection's parent is an anchor tag.
    /// Will be nil if there is no href, or it is an empty string.
    public var selectedHref: String?
    
    public var selectedLinkTitle:String?

    /// Whether or not the selection has a type specifically of "Range".
    public var hasRangeSelection: Bool {
        return runJS("RE.rangeSelectionExists();") == "true" ? true : false
    }

    /// Whether or not the selection has a type specifically of "Range" or "Caret".
    public var hasRangeOrCaretSelection: Bool {
        return runJS("RE.rangeOrCaretSelectionExists();") == "true" ? true : false
    }

    // MARK: Methods

    public func removeFormat() {
        runJS("RE.removeFormat();")
    }
    
    public func setFontSize(_ size: Int) {
        runJS("RE.setFontSize('\(size)px');")
    }
    
    public func setEditorBackgroundColor(_ color: UIColor) {
        runJS("RE.setBackgroundColor('\(color.hex)');")
    }
    
    public func undo() {
        runJS("RE.undo();")
    }
    
    public func redo() {
        runJS("RE.redo();")
    }
    
    public func bold() {
        runJS("RE.setBold();")
    }
    
    public func italic() {
        runJS("RE.setItalic();")
    }
    
    // "superscript" is a keyword
    public func subscriptText() {
        runJS("RE.setSubscript();")
    }
    
    public func superscript() {
        runJS("RE.setSuperscript();")
    }
    
    public func strikethrough() {
        runJS("RE.setStrikeThrough();")
    }
    
    public func underline() {
        runJS("RE.setUnderline();")
    }
    
    public func setTextColor(_ color: UIColor) {
        runJS("RE.prepareInsert();")
        runJS("RE.setTextColor('\(color.hex)');")
    }
    
    public func setTextBackgroundColor(_ color: UIColor) {
        runJS("RE.prepareInsert();")
        runJS("RE.setTextBackgroundColor('\(color.hex)');")
    }
    
    public func header(_ h: Int) {
        runJS("RE.setHeading('h\(h)');")
    }

    public func indent() {
        runJS("RE.setIndent();")
    }

    public func outdent() {
        runJS("RE.setOutdent();")
    }

    public func orderedList() {
        runJS("RE.setOrderedList();")
    }

    public func unorderedList() {
        runJS("RE.setUnorderedList();")
    }

    public func blockquote() {
        runJS("RE.setBlockquote()");
    }
    
    public func alignLeft() {
        runJS("RE.setJustifyLeft();")
    }
    
    public func alignCenter() {
        runJS("RE.setJustifyCenter();")
    }
    
    public func alignRight() {
        runJS("RE.setJustifyRight();")
    }
    
    public func runCustomJS(js:String) {
        runJS(js)
    }
    
    public func insertImage(_ url: String, alt: String, imageId:String) {
        runJS("RE.prepareInsert();")
        runJS("RE.insertImage('\(url.escaped)', '\(alt.escaped)','\(imageId)');")
    }
    
    public func insertLink(_ href: String, title: String) {
        if !href.hasPrefix("http") {
            UIAlertView(title: "网址必须以http开头", message: nil, delegate: nil, cancelButtonTitle: "确定").show()
        } else {
            runJS("RE.prepareInsert();")
            runJS("RE.insertLink('\(href.escaped)', '\(title.escaped)');")
        }
        self.selectedHref = nil
        self.selectedLinkTitle = nil
    }
    
    public func updateLink(_ href:String,title:String) {
        if !href.hasPrefix("http") {
            UIAlertView(title: "网址必须以http开头", message: nil, delegate: nil, cancelButtonTitle: "确定").show()
        } else {
            runJS("RE.prepareInsert();")
            runJS("RE.updateLink('\(href.escaped)', '\(title.escaped)');")
        }
        self.selectedHref = nil
        self.selectedLinkTitle = nil
    }
    
    public func focus() {
        runJS("RE.focus();")
    }

    public func focus(at: CGPoint) {
        runJS("RE.focusAtPoint(\(at.x), \(at.y));")
    }
    
    public func blur() {
        runJS("RE.blurFocus()")
    }
    
    public func titleDisplay() {
        self.displayTitle = !self.displayTitle
        if let toolBar = self.inputAccessoryView as? RichEditorToolbar,(toolBar.items?.count ?? 0) > 0 {
            for item in toolBar.items! {
                let itemLabel = (item as? RichBarButtonItem)?.label ?? ""
                if itemLabel == "title" {
                    if self.displayTitle {
                        item.tintColor = barButtonItemSelectedDefaultColor
                    } else {
                        item.tintColor = barButtonItemDefaultColor
                    }
                }
            }
        }
        runJS("RE.displayTitle(\(self.displayTitle))")
    }

    /// Runs some JavaScript on the UIWebView and returns the result
    /// If there is no result, returns an empty string
    /// - parameter js: The JavaScript string to be run
    /// - returns: The result of the JavaScript that was run
    @discardableResult
    public func runJS(_ js: String) -> String {
        let string = webView.stringByEvaluatingJavaScript(from: js) ?? ""
        return string
    }

    public func updateImageProgress(imageId:String,progress:Double) {
        runJS("RE.updateImageProgress('\(progress)', '\(imageId)');")
    }
    
    public func imageUploadSuccess(imageId:String) {
        runJS("RE.imageUploadSuccess('\(imageId)');")
    }
    
    public func imageUploadFail(imageId:String) {
        
    }
    
    // MARK: - Delegate Methods


    // MARK: UIScrollViewDelegate

    public func scrollViewDidScroll(_ scrollView: UIScrollView) {
        // We use this to keep the scroll view from changing its offset when the keyboard comes up
        if !isScrollEnabled {
            scrollView.bounds = webView.bounds
        }
    }


    // MARK: UIWebViewDelegate

    public func webView(_ webView: UIWebView, shouldStartLoadWith request: URLRequest, navigationType: UIWebViewNavigationType) -> Bool {
        // Handle pre-defined editor actions
        let callbackPrefix = "re-callback://"
        if request.url?.absoluteString.hasPrefix(callbackPrefix) == true {
            
            // When we get a callback, we need to fetch the command queue to run the commands
            // It comes in as a JSON array of commands that we need to parse
            let commands = runJS("RE.getCommandQueue();")

            if let data = commands.data(using: .utf8) {
                
                let jsonCommands: [String]
                do {
                    jsonCommands = try JSONSerialization.jsonObject(with: data) as? [String] ?? []
                } catch {
                    jsonCommands = []
                    NSLog("RichEditorView: Failed to parse JSON Commands")
                }

                jsonCommands.forEach(performCommand)
            }

            return false
        } else if request.url?.absoluteString.hasPrefix("callback://0/") == true {
            let methodName = (request.url!.absoluteString).replacingOccurrences(of: "callback://0/", with: "")
            updateToolBarWithButtonNames(name: methodName)
        }
        
        // User is tapping on a link, so we should react accordingly
        if navigationType == .linkClicked {
            if let
                url = request.url,
                let shouldInteract = delegate?.richEditor?(self, shouldInteractWith: url)
            {
                return shouldInteract
            }
        }
        
        return true
    }

    public func webViewDidFinishLoad(_ webView: UIWebView) {
        after(0.5) {
            self.focus()
        }
    }

    // MARK: UIGestureRecognizerDelegate

    /// Delegate method for our UITapGestureDelegate.
    /// Since the internal web view also has gesture recognizers, we have to make sure that we actually receive our taps.
    public func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
        return true
    }


    // MARK: - Private Implementation Details

    private var isContentEditable: Bool {
        get {
            if isEditorLoaded {
                let value = runJS("RE.editor.isContentEditable")
                editingEnabledVar = Bool(value) ?? false
                return editingEnabledVar
            }
            return editingEnabledVar
        }
        set {
            editingEnabledVar = newValue
            if isEditorLoaded {
                let value = newValue ? "true" : "false"
                runJS("RE.editor.contentEditable = \(value);")
            }
        }
    }
    
    /// The position of the caret relative to the currently shown content.
    /// For example, if the cursor is directly at the top of what is visible, it will return 0.
    /// This also means that it will be negative if it is above what is currently visible.
    /// Can also return 0 if some sort of error occurs between JS and here.
    private var relativeCaretYPosition: Int {
        let string = runJS("RE.getRelativeCaretYPosition();")
        return Int(string) ?? 0
    }
    
    /// Called when actions are received from JavaScript
    /// - parameter method: String with the name of the method and optional parameters that were passed in
    private func performCommand(_ method: String) {
        if method.hasPrefix("ready") {
            // If loading for the first time, we have to set the content HTML to be displayed
            if !isEditorLoaded {
                isEditorLoaded = true
                html = contentHTML
                isContentEditable = editingEnabledVar
                placeholder = placeholderText
                lineHeight = innerLineHeight
                delegate?.richEditorDidLoad?(self)
            }
        }
        else if method.hasPrefix("input") {
            let content = runJS("RE.getHtml()")
            contentHTML = content
        }
        else if method.hasPrefix("updateHeight") {
        }
        else if method.hasPrefix("focus") {
            delegate?.richEditorTookFocus?(self)
        }
        else if method.hasPrefix("blur") {
            delegate?.richEditorLostFocus?(self)
        }
        else if method.hasPrefix("action/") {
            let content = runJS("RE.getHtml()")
            contentHTML = content
            
            // If there are any custom actions being called
            // We need to tell the delegate about it
            let actionPrefix = "action/"
            let range = method.range(of: actionPrefix)!
            let action = method.replacingCharacters(in: range, with: "")
            delegate?.richEditor?(self, handle: action)
        }
    }

    /// Called by the UITapGestureRecognizer when the user taps the view.
    /// If we are not already the first responder, focus the editor.
    @objc private func viewWasTapped() {
        if !webView.containsFirstResponder {
            let point = tapRecognizer.location(in: webView)
            focus(at: point)
        }
    }
    
    private func updateToolBarWithButtonNames(name:String) {
        let nameItems = name.split(separator: ",")
        var itemsModified = [String]()
        for linkItem in nameItems {
            var updateItem = linkItem
            if linkItem.hasPrefix("link:") {
                updateItem = "link"
                self.selectedHref = (linkItem as NSString).substring(from: 5)
                let toolbar = (self.inputAccessoryView as? RichEditorToolbar)
                if toolbar != nil {
                    toolbar?.delegate?.richEditorToolbarInsertLink!(toolbar!)
                }
            } else if linkItem.hasPrefix("link-title:") {
                self.selectedLinkTitle = (linkItem as NSString).substring(from: 11)
            } else if linkItem.hasPrefix("image:") {
                updateItem = "image"
            }
            itemsModified.append(String(updateItem))
        }
        editorItemsEnabled = itemsModified
        if let toolBar = self.inputAccessoryView as? RichEditorToolbar,(toolBar.items?.count ?? 0) > 0 {
            for item in toolBar.items! {
                let itemLabel = (item as? RichBarButtonItem)?.label ?? ""
                if !itemsModified.contains(itemLabel){
                    item.tintColor = barButtonItemDefaultColor
                } else {
                    item.tintColor = barButtonItemSelectedDefaultColor
                }
                if itemLabel == "image" {
                    item.tintColor = barButtonItemDefaultColor
                }
                if itemLabel == "title" {
                    if self.displayTitle {
                        item.tintColor = barButtonItemSelectedDefaultColor
                    } else {
                        item.tintColor = barButtonItemDefaultColor
                    }
                }
            }
        }
    }
    
    func after(_ time:Float,block:@escaping () -> Void) {
        let dtime = DispatchTime.now() + Double(Int64(Double(time) * Double(NSEC_PER_SEC))) / Double(NSEC_PER_SEC)
        DispatchQueue.main.asyncAfter(deadline: dtime) { () -> Void in
            block()
        }
    }
}
