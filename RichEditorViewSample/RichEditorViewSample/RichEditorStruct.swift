//
//  RichEditorStruct.swift
//  RichEditorViewSample
//
//  Created by zhuzhanping on 2017/11/3.
//  Copyright © 2017年 Caesar Wirth. All rights reserved.
//

import Foundation
import RichEditorView

//自定义工具栏
public enum RichEditorCustomOption: RichEditorOption {

    case image//图片
    case title//标题隐藏显示
    case bold//加粗
    case blockquote//引用
    case link//超链接
    case orderedList//项目符号
    case header//标题
    
    public static let custom:[RichEditorCustomOption] = [
        .image,.title,.bold,.blockquote,.link,.orderedList,.header
    ]
    
    public var image: UIImage? {
        var name = ""
        switch self {
        case .image: name = "re_image"
        case .title: name = "re_title"
        case .bold: name = "re_bold"
        case .blockquote: name = "re_blockquote"
        case .link: name = "re_link"
        case .orderedList: name = "re_list"
        case .header: name = "re_head"
        }
        return UIImage(named: name)
    }
    
    public var title: String {
        switch self {
        case .image: return "image"
        case .title: return "title"
        case .bold: return "bold"
        case .blockquote: return "blockquote"
        case .link: return "link"
        case .orderedList: return "unorderedList"
        case .header: return "h3"
        }
    }
    
    public func action(_ toolbar: RichEditorToolbar) {
        switch self {
        case .image: toolbar.delegate?.richEditorToolbarInsertImage?(toolbar)
        case .title: toolbar.editor?.titleDisplay()
        case .bold: toolbar.editor?.bold()
        case .blockquote: toolbar.editor?.blockquote()
        case .link: toolbar.delegate?.richEditorToolbarInsertLink?(toolbar)
        case .orderedList: toolbar.editor?.unorderedList()
        case .header: toolbar.editor?.header(3)
        }
    }
}
