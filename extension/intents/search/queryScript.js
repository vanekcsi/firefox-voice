/* globals communicate */

this.queryScript = (function() {
  const CARD_SELECTOR = ".vk_c, .kp-blk, .EyBRub";
  const SIDEBAR_SELECTOR = "#rhs";
  const MAIN_SELECTOR = "#center_col";
  const AD_CLASS = "commercial-unit-desktop-rhs";

  function findCards() {
    const topElement = document.querySelector("a > h3");
    const maxBottom = topElement.getBoundingClientRect().y;
    return {
      card: findCardIn(document.querySelector(MAIN_SELECTOR), maxBottom),
      sidebarCard: findCardIn(document.querySelector(SIDEBAR_SELECTOR), null),
    };
  }

  function findCardIn(container, maxBottom) {
    let selected = Array.from(container.querySelectorAll(CARD_SELECTOR));
    if (maxBottom) {
      // FIXME: this is testing if the top of the card is above the top of the first search
      // result, as opposed to testing if the *bottom* of the card is there. This probably doesn't
      // result in any false positives (or negatives), but the names are unclear here.
      selected = selected.filter(e => e.getBoundingClientRect().y <= maxBottom);
    }
    selected = selected.filter(e => !isRhsAd(e));
    if (selected.length) {
      return selected[0];
    }
    for (const div of container.querySelectorAll("div")) {
      if (maxBottom) {
        const box = div.getBoundingClientRect();
        if (box.top > maxBottom) {
          break;
        }
        if (box.bottom > maxBottom) {
          continue;
        }
      }
      if (hasCardBorder(div)) {
        return div;
      }
    }
    return undefined;
  }

  function hasCardBorder(element) {
    const style = getComputedStyle(element);
    const COLOR = "rgb(223, 225, 229)";
    const RADIUS = "8px";
    return (
      style.borderTopColor === COLOR &&
      style.borderBottomColor === COLOR &&
      style.borderLeftColor === COLOR &&
      style.borderRightColor === COLOR &&
      style.borderTopLeftRadius === RADIUS &&
      style.borderTopRightRadius === RADIUS &&
      style.borderBottomLeftRadius === RADIUS &&
      style.borderBottomRightRadius === RADIUS
    );
  }

  function isRhsAd(element) {
    while (element && element.classList) {
      if (element.classList.contains(AD_CLASS)) {
        return true;
      }
      element = element.parentNode;
    }
    return false;
  }

  communicate.register("searchResultInfo", message => {
    const cards = findCards();
    const searchHeaders = document.querySelectorAll("a > h3");
    const searchResults = [];
    for (const searchHeader of searchHeaders) {
      searchResults.push({
        url: searchHeader.parentNode.href,
        title: searchHeader.textContent,
      });
    }
    return {
      hasSidebarCard: !!cards.sidebarCard,
      hasCard: !!cards.card,
      searchResults,
      searchUrl: location.href,
    };
  });

  communicate.register("cardImage", message => {
    const cards = findCards();
    const card = cards.sidebarCard || cards.card;
    if (!card) {
      throw new Error("No card found for cardImage");
    }
    // When it has a canvas it may dynamically update,
    // And timers have this id, otherwise hard to detect:
    const hasWidget = !!(
      card.querySelector("canvas") ||
      card.querySelector("#timer-stopwatch-container")
    );
    const rect = card.getBoundingClientRect();
    const canvas = document.createElementNS(
      "http://www.w3.org/1999/xhtml",
      "canvas"
    );
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    const ctx = canvas.getContext("2d");
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.drawWindow(window, rect.x, rect.y, rect.width, rect.height, "#fff");
    return {
      width: rect.width,
      height: rect.height,
      src: canvas.toDataURL(),
      alt: card.innerText,
      hasWidget,
    };
  });
})();
