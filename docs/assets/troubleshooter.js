(function (global) {
  "use strict";

  function asText(value) {
    return typeof value === "string" ? value : "";
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return asText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderMarkdownHtml(text) {
    var source = asText(text).trim();
    if (!source) {
      return "";
    }

    if (global.marked && global.DOMPurify) {
      global.marked.setOptions({ breaks: true, gfm: true });
      return global.DOMPurify.sanitize(global.marked.parse(source));
    }

    return source
      .split(/\n{2,}/)
      .map(function (block) {
        return "<p>" + escapeHtml(block).replace(/\n/g, "<br />") + "</p>";
      })
      .join("");
  }

  function normalizeLink(link) {
    return {
      label: asText(link && link.label),
      href: asText(link && link.href)
    };
  }

  function normalizeResult(result) {
    return {
      title: asText(result && result.title),
      image: asText(result && result.image),
      summary: asText(result && result.summary),
      steps: asArray(result && result.steps).map(asText).filter(Boolean),
      links: asArray(result && result.links).map(normalizeLink).filter(function (item) {
        return item.label && item.href;
      })
    };
  }

  function normalizeChoice(choice) {
    var normalized = {
      label: asText(choice && choice.label),
      description: asText(choice && choice.description),
      result: null,
      next: null
    };

    if (choice && choice.result) {
      normalized.result = normalizeResult(choice.result);
    }
    if (choice && choice.next) {
      normalized.next = normalizeNode(choice.next);
    }

    return normalized;
  }

  function normalizeNode(node) {
    return {
      title: asText(node && node.title),
      image: asText(node && node.image),
      question: asText(node && node.question),
      details: asText(node && node.details),
      choices: asArray(node && node.choices).map(normalizeChoice)
    };
  }

  function normalizeData(data) {
    return {
      title: asText(data && data.title) || "Troubleshooter",
      description: asText(data && data.description),
      intro: asText(data && data.intro),
      supportChecklist: asArray(data && data.supportChecklist).map(asText).filter(Boolean),
      quickLinks: asArray(data && data.quickLinks).map(normalizeLink).filter(function (item) {
        return item.label && item.href;
      }),
      root: normalizeNode((data && data.root) || {})
    };
  }

  function getNodeAtPath(root, path) {
    var node = root;
    var i;
    for (i = 0; i < path.length; i += 1) {
      if (!node || !node.choices || !node.choices[path[i]] || !node.choices[path[i]].next) {
        return null;
      }
      node = node.choices[path[i]].next;
    }
    return node;
  }

  function walkTree(node, visitor, path) {
    var nextPath = Array.isArray(path) ? path.slice() : [];
    visitor(node, nextPath);
    asArray(node && node.choices).forEach(function (choice, index) {
      if (choice && choice.next) {
        var childPath = nextPath.concat(index);
        walkTree(choice.next, visitor, childPath);
      }
    });
  }

  function readJsonFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error("No file selected."));
        return;
      }

      var reader = new FileReader();
      reader.onload = function () {
        try {
          resolve(normalizeData(JSON.parse(String(reader.result || ""))));
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = function () {
        reject(new Error("Failed to read file."));
      };
      reader.readAsText(file);
    });
  }

  function loadJsonUrl(url) {
    return fetch(url, { cache: "no-store" }).then(function (response) {
      if (!response.ok) {
        throw new Error("Request failed with status " + response.status + ".");
      }
      return response.json();
    }).then(normalizeData);
  }

  function downloadText(filename, text, mimeType) {
    var blob = new Blob([text], { type: mimeType || "text/plain;charset=utf-8" });
    var href = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(href);
  }

  function formatPath(path) {
    return path.length ? path.map(function (part) { return part + 1; }).join(".") : "root";
  }

  function treeToMarkdown(data) {
    var flow = normalizeData(data);
    var lines = [];

    function buttonClass() {
      return "inline-flex text-white bg-indigo-500 border-0 py-1 px-4 focus:outline-none hover:bg-indigo-400 text-lg rounded-full mr-2 mb-2";
    }

    function nodeAnchor(path) {
      return "node-" + (path.length ? path.map(function (part) { return part + 1; }).join("-") : "root");
    }

    function resultAnchor(path) {
      return "result-" + path.map(function (part) { return part + 1; }).join("-");
    }

    function renderNode(node, path, depth) {
      var headingLevel = Math.min(depth, 6);
      var heading = new Array(headingLevel + 1).join("#");
      var sectionTitle = node.title || node.question || (path.length ? "Step " + formatPath(path) : flow.title);

      lines.push("");
      lines.push('<a id="' + nodeAnchor(path) + '"></a>');
      lines.push(heading + " " + sectionTitle);
      if (node.image) {
        lines.push("");
        lines.push("![" + escapeHtml(sectionTitle || "Step") + "](" + node.image + ")");
      }
      if (node.question && node.question !== sectionTitle) {
        lines.push("");
        lines.push(node.question);
      }

      if (node.choices.length) {
        lines.push("");
        lines.push('<div class="flex flex-wrap gap-2 mt-4">');
        node.choices.forEach(function (choice, index) {
          var pathForChoice = path.concat(index);
          var target = choice.next ? nodeAnchor(pathForChoice) : resultAnchor(pathForChoice);
          lines.push('  <a href="#' + target + '"><button class="' + buttonClass() + '">' + escapeHtml(choice.label || ("Choice " + (index + 1))) + "</button></a>");
        });
        lines.push("</div>");
      }

      node.choices.forEach(function (choice, index) {
        var pathForChoice = path.concat(index);
        if (choice.next) {
          renderNode(choice.next, pathForChoice, depth + 1);
          return;
        }
        if (!choice.result) {
          return;
        }

        lines.push("");
        lines.push('<a id="' + resultAnchor(pathForChoice) + '"></a>');
        lines.push(new Array(Math.min(depth + 1, 6) + 1).join("#") + " " + (choice.label || choice.result.title || "Result"));
        if (choice.result.image) {
          lines.push("");
          lines.push("![" + escapeHtml(choice.result.title || choice.label || "Result") + "](" + choice.result.image + ")");
        }
        if (choice.result.summary) {
          lines.push("");
          lines.push(choice.result.summary);
        }
        if (choice.result.steps.length) {
          lines.push("");
          choice.result.steps.forEach(function (step, stepIndex) {
            lines.push((stepIndex + 1) + ". " + step);
          });
        }
        if (choice.result.links.length) {
          lines.push("");
          choice.result.links.forEach(function (link) {
            lines.push("- [" + escapeHtml(link.label) + "](" + link.href + ")");
          });
        }
      });
    }

    renderNode(flow.root, [], 1);
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function renderRuntime(container, data, options) {
    var flow = normalizeData(data);
    var state = {
      trail: [],
      currentPath: []
    };

    function renderCurrent() {
      var node = getNodeAtPath(flow.root, state.currentPath) || flow.root;
      var result = state.trail.length ? getActiveResult() : null;
      var trailHtml = state.trail.length
        ? state.trail.map(function (item) {
            return '<span class="px-3 py-1 rounded-full bg-gray-900 text-gray-200 text-xs border border-gray-700">' + escapeHtml(item.label) + "</span>";
          }).join("")
        : '<span class="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 text-xs border border-indigo-400/30">Start</span>';

      var choicesHtml = node.choices.map(function (choice, index) {
        return (
          '<button type="button" data-choice-index="' + index + '" class="inline-flex text-white bg-indigo-500 border-0 py-2 px-5 focus:outline-none hover:bg-indigo-400 text-base rounded-full mr-2 mb-2">' +
          escapeHtml(choice.label || ("Choice " + (index + 1))) +
          "</button>"
        );
      }).join("");

      var isResultView = Boolean(result);
      var activeTitle = isResultView
        ? (result.title || (state.trail[state.trail.length - 1] && state.trail[state.trail.length - 1].label) || "Resolution")
        : (node.title || flow.title || "Troubleshooter");
      var activeIntro = isResultView
        ? result.summary
        : (node.question || flow.intro);
      var activeIntroHtml = renderMarkdownHtml(activeIntro);
      var detailHtml = renderMarkdownHtml(node.details);
      var activeImageHtml = isResultView
        ? (result.image
            ? '<img src="' + escapeHtml(result.image) + '" alt="' + escapeHtml(activeTitle) + '" class="mx-auto mb-6 rounded-xl max-h-72 w-auto border border-gray-700" />'
            : "")
        : (node.image
            ? '<img src="' + escapeHtml(node.image) + '" alt="' + escapeHtml(activeTitle) + '" class="mx-auto mb-6 rounded-xl max-h-64 w-auto border border-gray-700" />'
            : "");
      var resultBodyHtml = isResultView
        ? (
            (result.steps.length
              ? '<ol class="mt-6 space-y-3 text-sm text-gray-100 list-decimal list-inside text-left max-w-2xl mx-auto">' + result.steps.map(function (step) {
                  return "<li>" + escapeHtml(step) + "</li>";
                }).join("") + "</ol>"
              : "") +
            (result.links.length
              ? '<div class="mt-6 max-w-2xl mx-auto text-left">' +
                  '<p class="text-xs uppercase tracking-[0.2em] text-gray-500 mb-3">Resources</p>' +
                  '<ul class="space-y-2 text-sm text-indigo-300">' + result.links.map(function (link) {
                    return '<li><a class="underline decoration-indigo-400/50 underline-offset-4 hover:text-indigo-200" href="' + escapeHtml(link.href) + '">' + escapeHtml(link.label) + "</a></li>";
                  }).join("") + "</ul>" +
                "</div>"
              : "")
          )
        : "";

      container.innerHTML =
        '<section class="max-w-4xl mx-auto bg-gray-800 rounded-xl p-8 ' + (isResultView ? "text-left" : "text-center") + '">' +
          '<div class="flex flex-wrap justify-center gap-2 mb-6">' + trailHtml + "</div>" +
          activeImageHtml +
          '<h2 class="text-3xl font-bold text-white">' + escapeHtml(activeTitle) + "</h2>" +
          (activeIntroHtml ? '<div class="md-copy text-gray-300 mt-4 text-lg ' + (isResultView ? "max-w-2xl" : "max-w-2xl mx-auto") + '">' + activeIntroHtml + "</div>" : "") +
          (!isResultView && detailHtml ? '<div class="md-copy text-sm text-gray-400 mt-3 max-w-2xl mx-auto">' + detailHtml + "</div>" : "") +
          (!isResultView && choicesHtml ? '<div class="flex flex-wrap justify-center mt-8">' + choicesHtml + "</div>" : "") +
          resultBodyHtml +
          '<div class="flex flex-wrap justify-center gap-2 mt-8">' +
            '<button type="button" id="runtime-back" class="inline-flex text-white bg-gray-900 border border-gray-700 py-2 px-4 hover:border-gray-500 text-sm rounded-full"' + (state.trail.length ? "" : " disabled") + '>Back</button>' +
            '<button type="button" id="runtime-reset" class="inline-flex text-white bg-indigo-500 border-0 py-2 px-4 hover:bg-indigo-400 text-sm rounded-full">Restart</button>' +
          "</div>" +
        "</section>";

      var choiceButtons = container.querySelectorAll("[data-choice-index]");
      Array.prototype.forEach.call(choiceButtons, function (button) {
        button.addEventListener("click", function () {
          var choice = node.choices[Number(button.getAttribute("data-choice-index"))];
          if (!choice) {
            return;
          }

          state.trail.push({
            label: choice.label || "Choice",
            choiceIndex: Number(button.getAttribute("data-choice-index")),
            pathBefore: state.currentPath.slice(),
            advanced: Boolean(choice.next)
          });
          if (choice.next) {
            state.currentPath.push(Number(button.getAttribute("data-choice-index")));
          }
          renderCurrent();
        });
      });

      var backButton = container.querySelector("#runtime-back");
      if (backButton) {
        backButton.addEventListener("click", function () {
          if (!state.trail.length) {
            return;
          }
          var lastStep = state.trail.pop();
          state.currentPath = lastStep && lastStep.pathBefore ? lastStep.pathBefore.slice() : [];
          renderCurrent();
        });
      }

      var resetButton = container.querySelector("#runtime-reset");
      if (resetButton) {
        resetButton.addEventListener("click", function () {
          state.trail = [];
          state.currentPath = [];
          renderCurrent();
        });
      }
    }

    function getActiveResult() {
      if (!state.trail.length) {
        return null;
      }
      var lastStep = state.trail[state.trail.length - 1];
      if (!lastStep || lastStep.advanced) {
        return null;
      }
      var node = getNodeAtPath(flow.root, lastStep.pathBefore || []) || flow.root;
      var resultChoice = node.choices[lastStep.choiceIndex];
      return resultChoice && resultChoice.result ? resultChoice.result : null;
    }

    renderCurrent();
  }

  global.Troubleshooter = {
    cloneData: cloneData,
    normalizeData: normalizeData,
    getNodeAtPath: getNodeAtPath,
    walkTree: walkTree,
    readJsonFile: readJsonFile,
    loadJsonUrl: loadJsonUrl,
    downloadText: downloadText,
    treeToMarkdown: treeToMarkdown,
    renderRuntime: renderRuntime,
    escapeHtml: escapeHtml,
    formatPath: formatPath,
    renderMarkdownHtml: renderMarkdownHtml
  };
})(window);
