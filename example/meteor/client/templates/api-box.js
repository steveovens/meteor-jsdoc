let apiData = options => {
  options = options || {};

  if (typeof options === "string") {
    options = {name: options};
  }

  let root = DocsData[options.name];

  if (! root) {
    console.log("API Data not found: " + options.name);
  }

  if (_.has(options, "options")) {
    root = _.clone(root);

    let includedOptions = options.options.split(';');

    root.options = _.filter(
      root.options,
      option => _.contains(includedOptions, option.name)
    );
  }

  return root;
};

let changeNamesIfNeeded = nameList => {
  return _.map(nameList, name => {
    // decode the "Array.<Type>" syntax
    if (name.slice(0, 7) === "Array.<") {
      // get the part inside angle brackets like in Array<String>
      name = name.match(/<([^>]+)>/)[1];

      if (name) {
        return "Array of " + name + "s";
      }

      console.log("no array type defined");
      return "Array";
    }

    return name;
  });
};

let toOrSentence = array => {
  if (array.length === 1) {
    return array[0];
  } else if (array.length === 2) {
    return array.join(" or ");
  }

  return _.initial(array).join(", ") + ", or " + _.last(array);
};

let typeNames = nameList => {
  // change names if necessary
  nameList = changeNamesIfNeeded(nameList);
  nameList = _.flatten(nameList);

  return toOrSentence(nameList);
};

Template.autoApiBox.helpers({
  apiData: apiData,
  signature() {
    let signature;
    let escapedLongname = _.escape(this.longname);
    let params, paramNames;

    if (this.istemplate || this.ishelper) {
      if (this.istemplate) {
        signature = "{{> ";
      } else {
        signature = "{{ ";
      }

      signature += escapedLongname;

      params = this.params;

      paramNames = _.map(params, param => {
        let name = param.name;

        name = name + "=" + name;

        if (param.optional) {
          return "[" + name + "]";
        }

        return name;
      });

      signature += " " + paramNames.join(" ");

      signature += " }}";
    } else {
      let beforeParens = escapedLongname;

      if (this.scope === "instance") {
        if (apiData(this.memberof)) {
          beforeParens = "<em>" + apiData(this.memberof).instancename + "</em>." + this.name;
        }
      } else if (this.kind === "class") {
        beforeParens = "new " + escapedLongname;
      }

      signature = beforeParens;

      // if it is a function, and therefore has arguments
      if (_.contains(["function", "class"], this.kind)) {
        params = this.params;

        paramNames = _.map(params, param => {
          if (param.optional) {
            return "[" + param.name + "]";
          }

          return param.name;
        });

        signature += "(" + paramNames.join(", ") + ")";
      }
    }

    return signature;
  },
  typeNames() {
    if (Session.get("showAllTypes") && this.type) {
      return typeNames(this.type.names);
    }
  },
  id() {
    return this.longname && this.longname.replace(/[.#]/g, "-");
  },
  arguments() {
    return _.reject(this.params, param => !! this[param.name]);
  },
  specialArguments() {
    return _.map(this.params, param => {
      if (this[param.name]) {
        return {
          name     : param.name,
          arguments: this[param.name]
        }
      }
    });
  }
});

Template.api_box_args.helpers({
  typeNames() {
    return this.type && typeNames(this.type.names);
  }
});

Template.api_box_eg.onRendered(function() {
  hljs.configure({
    tabReplace: "  ",
    useBR: true,
    languages: ["javascript", "css", "json", "coffeescript"]
  });

  this.$("code").each((i, block) => hljs.highlightBlock(block));
});
