"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _constants = require("./constants");

var _renderer = require("./renderer");

var _renderer2 = _interopRequireDefault(_renderer);

// Lexes and pipes tokens to the inline renderer

var InlineLexer = (function () {
  function InlineLexer(links, options) {
    _classCallCheck(this, InlineLexer);

    this.options = options;
    this.links = links;
    this.rules = _constants.inline.normal;

    this.renderer = new _renderer2["default"]();

    if (!this.links) throw new Error("Tokens array requires a `links` property.");
  }

  _createClass(InlineLexer, [{
    key: "output",

    // lex and send tokens to the renderer
    value: function output(src) {
      var cap = undefined,
          link = undefined,
          text = undefined,
          href = undefined,
          out = "";

      while (src) {
        // escape
        if (cap = this.rules.escape.exec(src)) {
          src = src.substring(cap[0].length);
          out += cap[1];
          continue;
        }

        // autolink
        if (cap = this.rules.autolink.exec(src)) {
          src = src.substring(cap[0].length);
          if (cap[2] === "@") {
            text = cap[1].charAt(6) === ":" ? cap[1].substring(7) : cap[1];
            href = "mailto:" + text;
          } else {
            text = (0, _constants.escape)(cap[1]);
            href = text;
          }
          out += this.renderer.link(href, null, text);
          continue;
        }

        // url (gfm)
        if (!this.inLink && (cap = this.rules.url.exec(src))) {
          src = src.substring(cap[0].length);
          text = (0, _constants.escape)(cap[1]);
          href = text;
          out += this.renderer.link(href, null, text);
          continue;
        }

        // link
        if (cap = this.rules.link.exec(src)) {
          src = src.substring(cap[0].length);
          this.inLink = true;
          out += this.outputLink(cap, {
            href: cap[2],
            title: cap[3]
          });
          this.inLink = false;
          continue;
        }

        // reflink, nolink
        if ((cap = this.rules.reflink.exec(src)) || (cap = this.rules.nolink.exec(src))) {
          src = src.substring(cap[0].length);
          link = (cap[2] || cap[1]).replace(/\s+/g, " ");
          link = this.links[link.toLowerCase()];
          if (!link || !link.href) {
            out += cap[0].charAt(0);
            src = cap[0].substring(1) + src;
            continue;
          }
          this.inLink = true;
          out += this.outputLink(cap, link);
          this.inLink = false;
          continue;
        }

        // strong
        if (cap = this.rules.strong.exec(src)) {
          src = src.substring(cap[0].length);
          out += this.renderer.strong(this.output(cap[2] || cap[1]));
          continue;
        }

        // em
        if (cap = this.rules.em.exec(src)) {
          src = src.substring(cap[0].length);
          out += this.renderer.em(this.output(cap[2] || cap[1]));
          continue;
        }

        // code
        if (cap = this.rules.code.exec(src)) {
          src = src.substring(cap[0].length);
          out += this.renderer.codespan((0, _constants.escape)(cap[2], true));
          continue;
        }

        // br
        if (cap = this.rules.br.exec(src)) {
          src = src.substring(cap[0].length);
          out += this.renderer.br();
          continue;
        }

        // del (gfm)
        if (cap = this.rules.del.exec(src)) {
          src = src.substring(cap[0].length);
          out += this.renderer.del(this.output(cap[1]));
          continue;
        }

        // text
        if (cap = this.rules.text.exec(src)) {
          src = src.substring(cap[0].length);
          out += (0, _constants.escape)(this.smartypants(cap[0]));
          continue;
        }

        if (src) {
          throw new Error("Infinite loop on byte: " + src.charCodeAt(0));
        }
      }

      return out;
    }
  }, {
    key: "outputLink",

    // Compile a link or Image
    value: function outputLink(cap, link) {
      var href = (0, _constants.escape)(link.href),
          title = link.title ? (0, _constants.escape)(link.title) : null;

      return cap[0].charAt(0) !== "!" ? this.renderer.link(href, title, this.output(cap[1])) : this.renderer.image(href, title, (0, _constants.escape)(cap[1]));
    }
  }, {
    key: "smartypants",

    // Turn dashes and stuff into special characters
    // -- SmartyPants
    value: function smartypants(text) {
      return text
      // em-dashes
      .replace(/--/g, "—")
      // opening singles
      .replace(/(^|[-\u2014/(\[{"\s])'/g, "$1‘")
      // closing singles & apostrophes
      .replace(/'/g, "’")
      // opening doubles
      .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, "$1“")
      // closing doubles
      .replace(/"/g, "”")
      // ellipses
      .replace(/\.{3}/g, "…");
    }
  }], [{
    key: "output",

    // Exposed output function
    value: function output(src, links, options) {
      return new InlineLexer(links, options).output(src);
    }
  }]);

  return InlineLexer;
})();

// Expose rules
InlineLexer.rules = _constants.inline;

exports["default"] = InlineLexer;
module.exports = exports["default"];