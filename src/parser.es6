import Renderer from "./renderer";
import InlineLexer from "./inline_lexer";

let _ = require("underscore")

// Class used to parse the tokens created by the Lexer, then call out to the
// appropriate render method to ouput the html.  Could have different renderers
// plugged into it.
class Parser {
  constructor(options = {}) {
    this.options = options;
    this.tokens = [];
    this.token = null;
    this.renderer = new Renderer();
    this.renderer.options = this.options;
  }

  // Static method to start parsing a token set
  static parse(src, options) {
    return new Parser(options).parse(src);
  }

  // Parse all the tokens, one by one.
  parse(src) {
    this.inline = new InlineLexer(src.links, this.options);
    this.tokens = src.reverse();

    let out = '';
    while (this.next()) {
      out += this.tok();
    }
    return out;
  }

  // Next Token
  next() {
    return this.token = this.tokens.pop();
  }

  // Preview Next Token
  peek() {
    return this.tokens[this.tokens.length - 1] || 0;
  }

  // Parse Text Tokens
  parseText() {
    var body = this.token.text;

    while (this.peek().type === 'text') {
      body += '\n' + this.next().text;
    }

    return this.inline.output(body);
  }

  // Parse Current Token
  tok() {
    var attributes = _.clone(this.attributes);
    if (this.token.type !== "attribute") this.attributes = null
    switch (this.token.type) {
      case 'space': {
        return '';
      }
      case 'hr': {
        return this.renderer.hr(attributes);
      }
      case 'heading': {
        return this.renderer.heading(
          this.inline.output(this.token.text),
          this.token.depth,
          this.token.text,
          attributes);
      }
      case 'code': {
        return this.renderer.code(this.token.text,
          this.token.lang,
          this.token.escaped,
          attributes);
      }
      case 'attribute': {
        let output = '';
        // Set the attributes for the next tag
        // or If we already have attributes, then print out the ones normally as text,
        // since we want to indicate to the user that they are not being used.
        // Unless it's the cursor, then we want to create a span and add the attr to it first.
        if (this.attributes) {
          let cursor;
          if (cursor = (_.find(this.attributes, (a) => a.key === 'data-markua-cursor-position' ? a : null))) {
            output = this.renderer.span('', [cursor]);
            this.attributes = this.token.attributes;
          } else if (cursor = (_.find(this.token.attributes, (a) => a.key === 'data-markua-cursor-position' ? a : null))) {
            output = this.renderer.span('', [cursor]);

            // Transfer attributes
            this.token.attributes = this.attributes;
          } else {
            output = this.renderer.paragraph(`{ ${_.map(this.attributes, (a) => a.key + ': ' + a.value ).join(',')} }`)
            this.attributes = this.token.attributes;
          }
        } else {
          this.attributes = this.token.attributes;
        }
        return output;
      }
      case 'figure': {
        return this.renderer.figure(this.token.alt,
          this.token.image,
          this.token.caption,
          attributes);
      }
      case 'table': {
        var header = ''
          , body = ''
          , i
          , row
          , cell
          , flags
          , j;

        // header
        cell = '';
        for (i = 0; i < this.token.header.length; i++) {
          flags = { header: true, align: this.token.align[i] };
          cell += this.renderer.tablecell(
            this.inline.output(this.token.header[i]),
            { header: true, align: this.token.align[i] }
          );
        }
        header += this.renderer.tablerow(cell);

        for (i = 0; i < this.token.cells.length; i++) {
          row = this.token.cells[i];

          cell = '';
          for (j = 0; j < row.length; j++) {
            cell += this.renderer.tablecell(
              this.inline.output(row[j]),
              { header: false, align: this.token.align[j] }
            );
          }

          body += this.renderer.tablerow(cell);
        }
        return this.renderer.table(header, body, attributes);
      }
      case 'aside_start': {
        var body = '';

        while (this.next().type !== 'aside_end') {
          body += this.tok();
        }

        return this.renderer.aside(body, attributes);
      }
      case 'blurb_start': {
        var body = '';

        while (this.next().type !== 'blurb_end') {
          body += this.tok();
        }

        return this.renderer.blurb(body, attributes);
      }
      case 'blockquote_start': {
        var body = '';

        while (this.next().type !== 'blockquote_end') {
          body += this.tok();
        }

        return this.renderer.blockquote(body, attributes);
      }
      case 'list_start': {
        var body = ''
          , listType = this.token.listType
          , start = this.token.start;

        while (this.next().type !== 'list_end') {
          body += this.tok();
        }

        return this.renderer.list(body, listType, start, attributes);
      }
      case 'list_item_start': {
        var body = '';

        let listType = this.token.listType, title = this.token.bullet;

        while (this.next().type !== 'list_item_end') {
          body += this.token.type === 'text'
            ? this.parseText()
            : this.tok();
        }

        if (listType === 'definition')
          return this.renderer.definitionListItem(body, title, attributes);
        else
          return this.renderer.listitem(body, attributes);
      }
      case 'paragraph': {
        return this.renderer.paragraph(this.inline.output(this.token.text), attributes);
      }
      case 'text': {
        return this.renderer.paragraph(this.parseText(), attributes);
      }
    }
  }
}

export default Parser;
