'use strict';

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _block = require('./constants');

// Class for lexing block elements of markua

var Lexer = (function () {
  function Lexer() {
    var options = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Lexer);

    this.tokens = [];
    this.tokens.links = {};
    this.options = options;
    this.rules = _block.block.normal;
  }

  _createClass(Lexer, [{
    key: 'lex',
    value: function lex(src) {
      // Preprocess
      src = src.replace(/\r\n|\r/g, '\n').replace(/\t/g, '    ').replace(/\u00a0/g, ' ').replace(/\u2424/g, '\n');

      // Go go go
      return this.token(src, true);
    }
  }, {
    key: 'token',
    value: function token(src, top, bq) {
      var cap = undefined;
      src = src.replace(/^ +$/gm, '');

      while (src) {
        // newline
        if (cap = this.rules.newline.exec(src)) {
          src = src.substring(cap[0].length);
          if (cap[0].length > 1) this.tokens.push({ type: 'space' });
        }

        // code
        if (cap = this.rules.code.exec(src)) {
          src = src.substring(cap[0].length);
          cap = cap[0].replace(/^ {4}/gm, '');
          this.tokens.push({
            type: 'code',
            text: cap
          });
          continue;
        }

        // fences (gfm)
        if (cap = this.rules.fences.exec(src)) {
          src = src.substring(cap[0].length);
          this.tokens.push({
            type: 'code',
            lang: cap[2],
            text: cap[3]
          });
          continue;
        }

        // heading
        if (cap = this.rules.heading.exec(src)) {
          src = src.substring(cap[0].length);
          this.tokens.push({
            type: 'heading',
            depth: cap[1].length,
            text: cap[2]
          });
          continue;
        }

        // table no leading pipe (gfm)
        if (top && (cap = this.rules.nptable.exec(src))) {
          src = src.substring(cap[0].length);
          var item = {
            type: 'table',
            header: cap[1].replace(/^ *| *\| *$/g, '').split(RegExp(' *\\| *')),
            align: cap[2].replace(/^ *|\| *$/g, '').split(RegExp(' *\\| *')),
            cells: cap[3].replace(/\n$/, '').split('\n')
          };

          for (var i = 0; i < item.align.length; i++) {
            if (/^ *-+: *$/.test(item.align[i])) {
              item.align[i] = 'right';
            } else if (/^ *:-+: *$/.test(item.align[i])) {
              item.align[i] = 'center';
            } else if (/^ *:-+ *$/.test(item.align[i])) {
              item.align[i] = 'left';
            } else {
              item.align[i] = null;
            }
          }

          for (var i = 0; i < item.cells.length; i++) {
            item.cells[i] = item.cells[i].split(RegExp(' *\\| *'));
          }

          this.tokens.push(item);
          continue;
        }

        // hr
        if (cap = this.rules.hr.exec(src)) {
          src = src.substring(cap[0].length);
          this.tokens.push({ type: 'hr' });
          continue;
        }

        // blockquote
        if (cap = this.rules.blockquote.exec(src)) {
          src = src.substring(cap[0].length);

          this.tokens.push({ type: 'blockquote_start' });

          cap = cap[0].replace(/^ *> ?/gm, '');

          // Pass `top` to keep the current
          // "toplevel" state. This is exactly
          // how markdown.pl works.
          this.token(cap, top, true);
          this.tokens.push({ type: 'blockquote_end' });
          continue;
        }

        // list
        if (cap = this.rules.list.exec(src)) {
          src = src.substring(cap[0].length);
          var bull = cap[2];

          this.tokens.push({
            type: 'list_start',
            ordered: bull.length > 1
          });

          // Get each top-level item.
          cap = cap[0].match(this.rules.item);

          var next = false;
          var l = cap.length;

          for (var i = 0; i < l; i++) {
            var item = cap[i];

            // Remove the list item's bullet
            // so it is seen as the next token.
            var space = item.length;
            item = item.replace(/^ *([*+-]|\d+\.) +/, '');

            // Outdent whatever the
            // list item contains. Hacky.
            if (~item.indexOf('\n ')) {
              space -= item.length;
              item = item.replace(/^ {1,4}/gm, '');
            }
            // Determine whether the next list item belongs here.
            // Backpedal if it does not belong in this list.
            if (this.options.smartLists && i != l - 1) {
              var b = _block.block.bullet.exec(cap[i + 1])[0];
              if (bull != b && !(bull.length > 1 && b.length > 1)) src = cap.slice(i + 1).join('\n') + src;
              i = l - 1;
            }

            // Determine whether item is loose or not.
            // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
            // for discount behavior.
            var loose = next || /\n\n(?!\s*$)/.test(item);

            if (i != l - 1) {
              next = item.charAt(item.length - 1) == '\n';
              if (!loose) loose = next;
            }

            this.tokens.push({ type: loose ? 'loose_item_start' : 'list_item_start' });

            // Recurse.
            this.token(item, false, bq);
            this.tokens.push({ type: 'list_item_end' });
          }
          this.tokens.push({ type: 'list_end' });
          continue;
        }

        // def
        if (!bq && top && (cap = this.rules.def.exec(src))) {
          src = src.substring(cap[0].length);
          this.tokens.links[cap[1].toLowerCase()] = {
            href: cap[2],
            title: cap[3]
          };
          continue;
        }

        // table (gfm)
        if (top && (cap = this.rules.table.exec(src))) {
          src = src.substring(cap[0].length);
          var item = {
            type: 'table',
            header: cap[1].replace(/^ *| *\| *$/g, '').split(RegExp(' *\\| *')),
            align: cap[2].replace(/^ *|\| *$/g, '').split(RegExp(' *\\| *')),
            cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
          };

          for (var i = 0; i < item.align.length; i++) {
            if (/^ *-+: *$/.test(item.align[i])) item.align[i] = 'right';else if (/^ *:-+: *$/.test(item.align[i])) item.align[i] = 'center';else if (/^ *:-+ *$/.test(item.align[i])) item.align[i] = 'left';else item.align[i] = null;
          }

          for (var i = 0; i < item.cells.length; i++) {
            item.cells[i] = item.cells[i].replace(/^ *\| *| *\| *$/g, '').split(RegExp(' *\\| *'));
          }

          this.tokens.push(item);
          continue;
        }

        // top-level paragraph
        if (top && (cap = this.rules.paragraph.exec(src))) {
          src = src.substring(cap[0].length);
          this.tokens.push({
            type: 'paragraph',
            text: cap[1].charAt(cap[1].length - 1) == '\n' ? cap[1].slice(0, -1) : cap[1]
          });
          continue;
        }

        // text
        if (cap = this.rules.text.exec(src)) {
          // Top-level should never reach here.
          src = src.substring(cap[0].length);
          this.tokens.push({
            type: 'text',
            text: cap[0]
          });
          continue;
        }

        if (src) throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
      }

      return this.tokens;
    }
  }], [{
    key: 'lex',
    value: function lex(src, options) {
      var lexer = new Lexer(options);
      return lexer.lex(src);
    }
  }]);

  return Lexer;
})();

;

exports['default'] = Lexer;
module.exports = exports['default'];