import XCTest
import SwiftTreeSitter
import TreeSitterMigoto

final class TreeSitterMigotoTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_migoto())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Migoto grammar")
    }
}
