// Модуль стану гри через IIFE
const StateModule = (function () {
  // Приватний кеш DOM-елементів
  const DOMCache = {
    gameBoard: document.getElementById("gameBoard"),
    logsList: document.getElementById("logsList"),
    initialDeckDisplay: document.getElementById("initialDeckDisplay"),
    usedDeckDisplay: document.getElementById("usedDeckDisplay"),
    hintDisplay: document.getElementById("hintDisplay"),
    totalTimeTimer: document
      .getElementById("totalTimeTimer")
      .querySelector("span"),
    pairTimeTimer: document
      .getElementById("pairTimeTimer")
      .querySelector("span"),
    gameContainer: document.getElementById("gameContainer"), // Додано gameContainer
  };

  // Приватний стан гри
  const gameState = {
    deck: [],
    usedCards: [],
    gameLogs: [],
    matchedSymbols: [],
    totalTimeMs: 0,
    pairTimeMs: 0,
    leftCardIndex: null,
    rightCardIndex: null,
    selectedLeftSymbol: null,
    selectedRightSymbol: null,
    isProcessingMatch: false,
    isAutoHintDeactivated: false,
    reset() {
      this.deck = [];
      this.usedCards = [];
      this.gameLogs = [];
      this.matchedSymbols = [];
      this.totalTimeMs = 0;
      this.pairTimeMs = 0;
      this.leftCardIndex = null;
      this.rightCardIndex = null;
      this.selectedLeftSymbol = null;
      this.selectedRightSymbol = null;
      this.isProcessingMatch = false;
      this.isAutoHintDeactivated = false;
      HintsCoreModule.HighlightModule.stopBlinkingHighlight();
      HintsCoreModule.HighlightModule.isBlinkingActive = false;
      HintsCoreModule.HintModule.hideHint();
    },
  };

  // Публічний інтерфейс
  return {
    getDOMCache: () => DOMCache,
    getGameState: () => gameState,
    resetGameState: () => gameState.reset(),
  };
})();

// Модуль "Головна логіка гри" через IIFE
const GameCoreModule = (function () {
  let isFirstPair = true; // Прапорець для першої пари

  function startGame() {
    console.log("Starting new game with:", {
      category: MainModalModule.getCategory(),
      difficulty: MainModalModule.getDifficulty(),
      cardsCount: CardsSliderModule.getSelectedCardsCount(),
    });

    StateModule.resetGameState();
    StateModule.getDOMCache().usedDeckDisplay.innerHTML = "";
    isFirstPair = true;

    // Скидаємо стан підказки
    HintsCoreModule.HintModule.resetHintState();

    const category = MainModalModule.getCategory();
    const difficulty = MainModalModule.getDifficulty();
    const numberOfSymbols = MainModalModule.getNumberOfSymbols();
    const theme = MainModalModule.getImageTheme();

    const fullDeck = DifficultyModule.generateDeck(
      category,
      difficulty,
      numberOfSymbols,
      theme
    );

    if (fullDeck.length === 0) {
      alert("Неможливо згенерувати колоду з такими параметрами!");
      return;
    }

    const selectedCardsCount = CardsSliderModule.getSelectedCardsCount();
    if (selectedCardsCount > fullDeck.length) {
      alert(
        `Вибрано більше карток (${selectedCardsCount}), ніж доступно (${fullDeck.length})!`
      );
      return;
    }
    const shuffledIndices = Array.from(
      { length: fullDeck.length },
      (_, i) => i
    );
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIndices[i], shuffledIndices[j]] = [
        shuffledIndices[j],
        shuffledIndices[i],
      ];
    }
    StateModule.getGameState().deck = shuffledIndices
      .slice(0, selectedCardsCount)
      .map((index) => fullDeck[index]);

    console.log(`Вибрано ${StateModule.getGameState().deck.length} карток для гри`);

    if (MainModalModule.getShowLogs()) {
      LogsModule.updateLogsDisplay(StateModule.getGameState().gameLogs, category, theme);
    }

    TimerWindowModule.showEndGameButton();
    TimerWindowModule.startTimers();

    const logsToggleContainer = document.getElementById("logsToggleContainer");
    const toggleLogsRadio = document.getElementById("toggleLogsRadio");
    const scrollToBottomLabel = document.getElementById("scrollToBottomLabel");
    toggleLogsRadio.checked = MainModalModule.getShowLogs();
    StateModule.getDOMCache().logsList.parentElement.style.display = MainModalModule.getShowLogs()
      ? "block"
      : "none";
    logsToggleContainer.style.display = MainModalModule.getShowLogs()
      ? "flex"
      : "none";
    scrollToBottomLabel.style.display =
      MainModalModule.getShowLogs() && toggleLogsRadio.checked
        ? "inline-flex"
        : "none";

    document.getElementById("highlightMainCardsButton").style.display =
      MainModalModule.getShowHighlightButton() ? "inline-block" : "none";
    document.getElementById("showHintButton").style.display = MainModalModule.getShowHintButton()
      ? "inline-block"
      : "none";
    const hintRadios = document.querySelector(".hint-radios");
    hintRadios.style.display = MainModalModule.getShowHintButton()
      ? "flex"
      : "none";
    const highlightRadios = document.querySelector(".highlight-radios");
    highlightRadios.style.display = MainModalModule.getShowHighlightButton()
      ? "flex"
      : "none";

    document.getElementById("hintControls").style.display =
      MainModalModule.getShowHighlightButton() ||
      MainModalModule.getShowHintButton()
        ? "flex"
        : "none";

    const initialDeckExplanation = document.querySelector(
      "#gameContainer > div.deck-explanation"
    );
    initialDeckExplanation.style.display = MainModalModule.getShowDeck()
      ? "block"
      : "none";
    document.getElementById("deckExplanation").style.display = MainModalModule.getShowDeck()
      ? "block"
      : "none";
    StateModule.getDOMCache().initialDeckDisplay.style.display =
      MainModalModule.getShowDeck() && document.getElementById("showInitialDeckCheckbox").checked
        ? "flex"
        : "none";
    StateModule.getDOMCache().usedDeckDisplay.style.display =
      MainModalModule.getShowDeck() && document.getElementById("showUsedDeckCheckbox").checked
        ? "flex"
        : "none";

    displayNextPair();
    if (MainModalModule.getShowDeck()) {
      HintsCoreModule.DeckModule.displayDeck(
        category,
        StateModule.getGameState().deck,
        StateModule.getGameState().usedCards,
        StateModule.getGameState().leftCardIndex,
        StateModule.getGameState().rightCardIndex,
        theme
      );
    }
  }

  function displayNextPair() {
    const availableCards = StateModule.getGameState()
      .deck.map((_, index) => index)
      .filter((index) => !StateModule.getGameState().usedCards.includes(index));

    if (availableCards.length < 2) {
      TimerWindowModule.showCompleteGameModal();
      return;
    }

    if (isFirstPair) {
      StateModule.getGameState().leftCardIndex =
        availableCards[Math.floor(Math.random() * availableCards.length)];
      const tempAvailableCards = availableCards.filter(
        (index) => index !== StateModule.getGameState().leftCardIndex
      );
      StateModule.getGameState().rightCardIndex =
        tempAvailableCards[Math.floor(Math.random() * tempAvailableCards.length)];
    } else {
      StateModule.getGameState().leftCardIndex = StateModule.getGameState().rightCardIndex;
      const tempAvailableCards = availableCards.filter(
        (index) => index !== StateModule.getGameState().leftCardIndex
      );
      StateModule.getGameState().rightCardIndex =
        tempAvailableCards[Math.floor(Math.random() * tempAvailableCards.length)];
    }

    displayCardPair(
      MainModalModule.getCategory(),
      MainModalModule.getImageTheme()
    );
    isFirstPair = false;
  }

  function displayCardPair(category, theme) {
    StateModule.getDOMCache().gameBoard.innerHTML = "";

    if (
      StateModule.getGameState().leftCardIndex === null ||
      StateModule.getGameState().rightCardIndex === null ||
      StateModule.getGameState().leftCardIndex >=
        StateModule.getGameState().deck.length ||
      StateModule.getGameState().rightCardIndex >=
        StateModule.getGameState().deck.length
    ) {
      TimerWindowModule.showCompleteGameModal();
      return;
    }

    let leftCardData =
      StateModule.getGameState().deck[StateModule.getGameState().leftCardIndex];
    let rightCardData =
      StateModule.getGameState().deck[StateModule.getGameState().rightCardIndex];

    // Застосовуємо логіку вирівнювання для ієрогліфів, зображень або слів
    if (MainModalModule.getDifficulty() === "beginner") {
      if (category === "images") {
        const preparedCards = DifficultyModule.ImageBeginnerLogic.prepareCards(
          StateModule.getGameState().leftCardIndex,
          StateModule.getGameState().rightCardIndex,
          StateModule.getGameState().deck,
          isFirstPair
        );
        if (preparedCards) {
          leftCardData = preparedCards.leftCard;
          rightCardData = preparedCards.rightCard;
        }
      } else if (category === "hieroglyphs") {
        const preparedCards =
          DifficultyModule.HieroglyphsBeginnerLogic.prepareCards(
            StateModule.getGameState().leftCardIndex,
            StateModule.getGameState().rightCardIndex,
            StateModule.getGameState().deck,
            isFirstPair
          );
        if (preparedCards) {
          leftCardData = preparedCards.leftCard;
          rightCardData = preparedCards.rightCard;
        }
      } else if (category === "words") {
        const preparedCards =
          DifficultyModule.WordsBeginnerLogic.prepareCards(
            StateModule.getGameState().leftCardIndex,
            StateModule.getGameState().rightCardIndex,
            StateModule.getGameState().deck,
            isFirstPair
          );
        if (preparedCards) {
          leftCardData = preparedCards.leftCard;
          rightCardData = preparedCards.rightCard;
        }
      }
    }

    const leftCard = document.createElement("div");
    leftCard.classList.add("card");
    leftCard.dataset.position = "left";
    const rightCard = document.createElement("div");
    rightCard.classList.add("card");
    rightCard.dataset.position = "right";

    leftCardData.forEach((symbol) => {
      const symbolDiv = document.createElement("div");
      symbolDiv.classList.add("symbol");
      symbolDiv.dataset.symbol = symbol;
      if (category === "numbers") symbolDiv.classList.add("number");
      else if (category === "hieroglyphs") symbolDiv.classList.add("hieroglyph");
      else if (category === "words") symbolDiv.classList.add("word");
      else if (category === "images") symbolDiv.classList.add("image");

      if (
        category === "numbers" ||
        category === "hieroglyphs" ||
        category === "words"
      ) {
        symbolDiv.textContent = symbol;
      } else if (category === "images") {
        const img = document.createElement("img");
        img.src = `resource/images/${theme}/${symbol}`;
        img.onerror = () => {
          img.alt = "Зображення не знайдено";
          img.src = "resource/images/default.png";
          console.warn(`Не вдалося завантажити зображення: ${img.src}`);
        };
        symbolDiv.appendChild(img);
      }
      leftCard.appendChild(symbolDiv);
    });

    rightCardData.forEach((symbol) => {
      const symbolDiv = document.createElement("div");
      symbolDiv.classList.add("symbol");
      symbolDiv.dataset.symbol = symbol;
      if (category === "numbers") symbolDiv.classList.add("number");
      else if (category === "hieroglyphs") symbolDiv.classList.add("hieroglyph");
      else if (category === "words") symbolDiv.classList.add("word");
      else if (category === "images") symbolDiv.classList.add("image");

      if (
        category === "numbers" ||
        category === "hieroglyphs" ||
        category === "words"
      ) {
        symbolDiv.textContent = symbol;
      } else if (category === "images") {
        const img = document.createElement("img");
        img.src = `resource/images/${theme}/${symbol}`;
        img.onerror = () => {
          img.alt = "Зображення не знайдено";
          img.src = "resource/images/default.png";
          console.warn(`Не вдалося завантажити зображення: ${img.src}`);
        };
        symbolDiv.appendChild(img);
      }
      rightCard.appendChild(symbolDiv);
    });

    StateModule.getDOMCache().gameBoard.appendChild(leftCard);
    StateModule.getDOMCache().gameBoard.appendChild(rightCard);

    TimerWindowModule.resetPairTimer();

    // Відображаємо підказку лише якщо вона явно активована
    if (
      document.getElementById("autoHintRadio").checked &&
      HintsCoreModule.HintModule.isAutoHintActive
    ) {
      HintsCoreModule.HintModule.showHint();
    } else {
      HintsCoreModule.HintModule.hideHint();
    }

    if (
      MainModalModule.getShowHighlightButton() &&
      document.getElementById("blinkHighlightRadio").checked &&
      HintsCoreModule.HighlightModule.isBlinkingActive
    ) {
      HintsCoreModule.HighlightModule.startBlinkingHighlight();
    } else {
      HintsCoreModule.HighlightModule.stopBlinkingHighlight();
    }

    if (MainModalModule.getShowDeck()) {
      HintsCoreModule.DeckModule.displayDeck(
        category,
        StateModule.getGameState().deck,
        StateModule.getGameState().usedCards,
        StateModule.getGameState().leftCardIndex,
        StateModule.getGameState().rightCardIndex,
        theme
      );
    }

    addSymbolClickListeners();
  }

  function addSymbolClickListeners() {
    const symbols = document.querySelectorAll(".symbol");
    symbols.forEach((symbol) => {
      symbol.addEventListener("click", handleSymbolClick);
    });
  }

  function handleSymbolClick(event) {
    if (StateModule.getGameState().isProcessingMatch) return;

    const symbol = event.target.closest(".symbol");
    const card = symbol.closest(".card");
    const position = card.dataset.position;

    if (position === "left") {
      if (StateModule.getGameState().selectedLeftSymbol) {
        StateModule.getGameState().selectedLeftSymbol.classList.remove("selected");
      }
      StateModule.getGameState().selectedLeftSymbol = symbol;
      symbol.classList.add("selected");
    } else if (position === "right") {
      if (StateModule.getGameState().selectedRightSymbol) {
        StateModule.getGameState().selectedRightSymbol.classList.remove("selected");
      }
      StateModule.getGameState().selectedRightSymbol = symbol;
      symbol.classList.add("selected");
    }

    if (
      StateModule.getGameState().selectedLeftSymbol &&
      StateModule.getGameState().selectedRightSymbol
    ) {
      checkMatch();
    }
  }

  function checkMatch() {
    console.log("Checking match:", {
      left: StateModule.getGameState().selectedLeftSymbol?.dataset.symbol,
      right: StateModule.getGameState().selectedRightSymbol?.dataset.symbol,
    });

    StateModule.getGameState().isProcessingMatch = true;

    const leftSymbol = StateModule.getGameState().selectedLeftSymbol;
    const rightSymbol = StateModule.getGameState().selectedRightSymbol;
    if (!leftSymbol || !rightSymbol) {
      StateModule.getGameState().isProcessingMatch = false;
      return;
    }

    const leftValue = leftSymbol.dataset.symbol;
    const rightValue = rightSymbol.dataset.symbol;
    const category = MainModalModule.getCategory();

    let isCorrect = leftValue === rightValue;
    let commonSymbol = null;

    if (isCorrect) {
      const leftSymbols =
        StateModule.getGameState().deck[
          StateModule.getGameState().leftCardIndex
        ];
      const rightSymbols =
        StateModule.getGameState().deck[
          StateModule.getGameState().rightCardIndex
        ];
      commonSymbol = leftSymbols.find((symbol) =>
        rightSymbols.includes(symbol)
      );
      StateModule.getGameState().matchedSymbols.push(commonSymbol);
    }

    leftSymbol.classList.remove("selected");
    rightSymbol.classList.remove("selected");
    leftSymbol.classList.add(isCorrect ? "correct" : "incorrect");
    rightSymbol.classList.add(isCorrect ? "correct" : "incorrect");

    TimerWindowModule.stopPairTimer();
    LogsModule.logMatch(
      commonSymbol,
      StateModule.getGameState().pairTimeMs,
      isCorrect,
      category,
      MainModalModule.getImageTheme()
    );

    setTimeout(() => {
      leftSymbol.classList.remove(isCorrect ? "correct" : "incorrect");
      rightSymbol.classList.remove(isCorrect ? "correct" : "incorrect");

      if (isCorrect) {
        StateModule.getGameState().usedCards.push(
          StateModule.getGameState().leftCardIndex
        );
        HintsCoreModule.DeckModule.moveCardToUsedDeck(
          StateModule.getGameState().leftCardIndex
        );
        displayNextPair();
      } else {
        TimerWindowModule.resetPairTimer();
        if (
          document.getElementById("blinkHighlightRadio").checked &&
          HintsCoreModule.HighlightModule.isBlinkingActive
        ) {
          HintsCoreModule.HighlightModule.startBlinkingHighlight();
        }
      }

      StateModule.getGameState().selectedLeftSymbol = null;
      StateModule.getGameState().selectedRightSymbol = null;
      StateModule.getGameState().isProcessingMatch = false;
    }, 500);
  }

  return {
    startGame,
    displayNextPair,
    displayCardPair,
    addSymbolClickListeners,
    handleSymbolClick,
    checkMatch,
  };
})();

// Модуль "Головне модальне вікно" через IIFE
const MainModalModule = (function () {
  const modal = document.getElementById("modal");
  const closeButton = document.getElementById("closeButton");
  const startGameButton = document.getElementById("startGameButton");
  const elementCategorySelect = document.getElementById("elementCategory");
  const numSymbolsNumbersSelect = document.getElementById("numSymbolsNumbers");
  const numSymbolsImagesSelect = document.getElementById("numSymbolsImages");
  const numSymbolsHieroglyphsSelect = document.getElementById(
    "numSymbolsHieroglyphs"
  );
  const numSymbolsWordsSelect = document.getElementById("numSymbolsWords");
  const numSymbolsNumbersContainer = document.getElementById(
    "numSymbolsNumbersContainer"
  );
  const numSymbolsImagesContainer = document.getElementById(
    "numSymbolsImagesContainer"
  );
  const numSymbolsHieroglyphsContainer = document.getElementById(
    "numSymbolsHieroglyphsContainer"
  );
  const numSymbolsWordsContainer = document.getElementById(
    "numSymbolsWordsContainer"
  );
  const imageThemeContainer = document.getElementById("imageThemeContainer");
  const imageThemeSelect = document.getElementById("imageTheme");
  const showDeckCheckbox = document.getElementById("showDeckCheckbox");
  const showLogsCheckbox = document.getElementById("showLogsCheckbox");
  const showHighlightButtonCheckbox = document.getElementById(
    "showHighlightButtonCheckbox"
  );
  const showHintButtonCheckbox = document.getElementById(
    "showHintButtonCheckbox"
  );

  function showModal() {
    modal.style.display = "flex";
    TimerWindowModule.hideEndGameButton();
    StateModule.getDOMCache().gameContainer.style.display = "none";
  }

  function closeModal() {
    modal.style.display = "none";
    StateModule.getDOMCache().gameContainer.style.display = "block";
  }

  function closeApp() {
    window.close();
  }

  function updateCategoryOptions() {
    const category = elementCategorySelect.value;
    numSymbolsNumbersContainer.style.display = "none";
    numSymbolsImagesContainer.style.display = "none";
    numSymbolsHieroglyphsContainer.style.display = "none";
    numSymbolsWordsContainer.style.display = "none";
    imageThemeContainer.style.display = "none";

    let numberOfSymbols = 4;
    if (category === "numbers") {
      numSymbolsNumbersContainer.style.display = "block";
      numberOfSymbols = parseInt(numSymbolsNumbersSelect.value);
    } else if (category === "images") {
      numSymbolsImagesContainer.style.display = "block";
      imageThemeContainer.style.display = "block";
      updateNumSymbolsImagesOptions();
      numberOfSymbols = parseInt(numSymbolsImagesSelect.value);
    } else if (category === "hieroglyphs") {
      numSymbolsHieroglyphsContainer.style.display = "block";
      numberOfSymbols = parseInt(numSymbolsHieroglyphsSelect.value);
    } else if (category === "words") {
      numSymbolsWordsContainer.style.display = "block";
      numberOfSymbols = parseInt(numSymbolsWordsSelect.value);
    }
    DifficultyModule.updateDifficultyOptions(category);
    CardsSliderModule.updateSlider(numberOfSymbols);
  }

  function updateNumSymbolsImagesOptions() {
    const theme = imageThemeSelect.value;
    let options = "";
    const availableOptions = {
      classic: [3, 4, 6],
      gray_green: [3, 4, 6],
    };

    const themeOptions = availableOptions[theme] || [];
    themeOptions.forEach((num) => {
      options += `<option value="${num}" ${
        num === 4 ? "selected" : ""
      }>${num}</option>`;
    });

    numSymbolsImagesSelect.innerHTML = options;
  }

  closeButton.addEventListener("click", closeApp);

  startGameButton.addEventListener("click", () => {
    GameCoreModule.startGame();
    closeModal();
  });

  elementCategorySelect.addEventListener("change", updateCategoryOptions);

  [
    numSymbolsNumbersSelect,
    numSymbolsImagesSelect,
    numSymbolsHieroglyphsSelect,
    numSymbolsWordsSelect,
  ].forEach((select) => {
    select.addEventListener("change", () => {
      const numberOfSymbols = parseInt(select.value);
      CardsSliderModule.updateSlider(numberOfSymbols);
    });
  });

  imageThemeSelect.addEventListener("change", updateNumSymbolsImagesOptions);

  return {
    showModal,
    closeModal,
    getCategory: () => elementCategorySelect.value,
    getDifficulty: () => DifficultyModule.getDifficulty(),
    getNumberOfSymbols: () => {
      const category = elementCategorySelect.value;
      if (category === "numbers")
        return parseInt(numSymbolsNumbersSelect.value);
      if (category === "images") return parseInt(numSymbolsImagesSelect.value);
      if (category === "hieroglyphs")
        return parseInt(numSymbolsHieroglyphsSelect.value);
      if (category === "words") return parseInt(numSymbolsWordsSelect.value);
    },
    getImageTheme: () => imageThemeSelect.value,
    getShowDeck: () => showDeckCheckbox.checked,
    getShowLogs: () => showLogsCheckbox.checked,
    getShowHighlightButton: () => showHighlightButtonCheckbox.checked,
    getShowHintButton: () => showHintButtonCheckbox.checked,
  };
})();

// Модуль "Повзунок"
const CardsSliderModule = (function () {
  const numCardsSlider = document.getElementById("numCardsSlider");
  const minCardsSpan = document.getElementById("minCards");
  const midCardsSpan = document.getElementById("midCards");
  const maxCardsSpan = document.getElementById("maxCards");
  const currentCardsValueSpan = document.getElementById("currentCardsValue");
  const sliderTicks = document.getElementById("sliderTicks");
  const decreaseCardsButton = document.getElementById("decreaseCards");
  const increaseCardsButton = document.getElementById("increaseCards");

  function calculateMaxCards(numberOfSymbols) {
    const n = numberOfSymbols - 1;
    return n * n + n + 1;
  }

  function updateSlider(numberOfSymbols) {
    const maxCards = calculateMaxCards(numberOfSymbols);
    const minCards = 2;
    const midCards = Math.floor((maxCards + minCards) / 2);

    numCardsSlider.min = minCards;
    numCardsSlider.max = maxCards;
    numCardsSlider.value = maxCards;

    minCardsSpan.textContent = `${minCards} (мін)`;
    midCardsSpan.textContent = `${midCards} (50%)`;
    maxCardsSpan.textContent = `(max) ${maxCards}`;
    currentCardsValueSpan.textContent = maxCards;

    updateButtonsState();

    sliderTicks.innerHTML = "";

    let majorPositions;
    if (maxCards > 100) {
      majorPositions = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    } else {
      const range = maxCards - minCards + 1;
      majorPositions = Array.from(
        { length: range },
        (_, i) => (i * 100) / (range - 1)
      );
    }

    const scaleFactor = 0.98;
    const offset = (100 - 100 * scaleFactor) / 2;

    majorPositions.forEach((position, index) => {
      const tick = document.createElement("div");
      tick.classList.add("tick", "long");
      const isMin = index === 0;
      const isMax = index === majorPositions.length - 1;
      const isMid =
        maxCards <= 100
          ? index === Math.floor((majorPositions.length - 1) / 2)
          : position === 50;
      if (isMin || isMax || isMid) {
        tick.classList.add("highlighted-tick");
      }
      const scaledPosition = offset + position * scaleFactor;
      tick.style.left = `${scaledPosition}%`;
      sliderTicks.appendChild(tick);
    });

    const intervals = majorPositions.length - 1;
    const minorTicksPerInterval = maxCards > 100 ? 9 : 0;

    if (maxCards > 100) {
      for (let i = 0; i < intervals; i++) {
        const startPos = majorPositions[i];
        const endPos = majorPositions[i + 1];
        const step = (endPos - startPos) / (minorTicksPerInterval + 1);

        for (let j = 1; j <= minorTicksPerInterval; j++) {
          const position = startPos + step * j;
          const scaledPosition = offset + position * scaleFactor;
          const tick = document.createElement("div");
          tick.classList.add("tick", "short");
          tick.style.left = `${scaledPosition}%`;
          sliderTicks.appendChild(tick);
        }
      }
    }

    console.log(
      `Оновлено повзунок: min=${minCards}, mid=${midCards}, max=${maxCards}, основних поділок=${majorPositions.length}`
    );
    console.log("Загальна кількість насічок:", sliderTicks.children.length);
  }

  function updateButtonsState() {
    const currentValue = parseInt(numCardsSlider.value);
    const minValue = parseInt(numCardsSlider.min);
    const maxValue = parseInt(numCardsSlider.max);

    decreaseCardsButton.disabled = currentValue <= minValue;
    increaseCardsButton.disabled = currentValue >= maxValue;
  }

  numCardsSlider.addEventListener("input", () => {
    currentCardsValueSpan.textContent = numCardsSlider.value;
    updateButtonsState();
  });

  decreaseCardsButton.addEventListener("click", () => {
    let currentValue = parseInt(numCardsSlider.value);
    if (currentValue > parseInt(numCardsSlider.min)) {
      currentValue -= 1;
      numCardsSlider.value = currentValue;
      currentCardsValueSpan.textContent = currentValue;
      updateButtonsState();
    }
  });

  increaseCardsButton.addEventListener("click", () => {
    let currentValue = parseInt(numCardsSlider.value);
    if (currentValue < parseInt(numCardsSlider.max)) {
      currentValue += 1;
      numCardsSlider.value = currentValue;
      currentCardsValueSpan.textContent = currentValue;
      updateButtonsState();
    }
  });

  return {
    updateSlider,
    getSelectedCardsCount: () => parseInt(numCardsSlider.value),
  };
})();

// Модуль "Складність" через IIFE

const DifficultyModule = (function () {
  const hieroglyphsList = [
    "一",
    "二",
    "三",
    "四",
    "五",
    "六",
    "七",
    "八",
    "九",
    "十",
    "人",
    "木",
    "水",
    "火",
    "土",
    "日",
    "月",
    "星",
    "山",
    "川",
  ];

  const wordsList = [
    "кіт",
    "собака",
    "дерево",
    "річка",
    "сонце",
    "місяць",
    "зоря",
    "гора",
    "будинок",
    "книга",
    "стіл",
    "крісло",
    "вікно",
    "двері",
    "машина",
    "день",
    "ніч",
    "ліс",
    "поле",
    "квітка",
  ];

  const difficultyLevelSelect = document.getElementById("difficultyLevel");
  const elementCategorySelect = document.getElementById("elementCategory");

  // Підмодуль "Логіка для цифр" через IIFE (без змін)
  const NumbersLogic = (function () {
    const BeginnerNumbersLogic = (function () {
      function generateBeginnerNumbersDobbleDeck(numberOfSymbols) {
        const n = numberOfSymbols - 1;
        const totalCards = n * n + n + 1;
        const totalSymbols = n * n + n + 1;
        const symbols = Array.from(
          { length: totalSymbols },
          (_, index) => index + 1
        );
        const deck = [];

        deck.push(symbols.slice(0, numberOfSymbols));
        for (let i = 0; i < n; i++) {
          const card = [symbols[0]];
          for (let j = 0; j < n; j++) {
            card.push(symbols[n + 1 + i * n + j]);
          }
          deck.push(card);
        }
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const card = [symbols[i + 1]];
            for (let k = 0; k < n; k++) {
              card.push(symbols[n + 1 + n * k + ((i * k + j) % n)]);
            }
            deck.push(card);
          }
        }
        console.log("Згенерована колода (Початковий рівень, Цифри):", deck);
        return deck;
      }

      return {
        generateBeginnerNumbersDobbleDeck,
      };
    })();

    const VeryEasyNumbersLogic = (function () {
      function generateVeryEasyNumbersDobbleDeck(numberOfSymbols) {
        function shuffleArray(array) {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        }
        const beginnerDeck =
          BeginnerNumbersLogic.generateBeginnerNumbersDobbleDeck(
            numberOfSymbols
          );
        const shuffledDeck = beginnerDeck.map((card) => shuffleArray(card));
        console.log(
          "Згенерована колода (Дуже легкий рівень, Цифри):",
          shuffledDeck
        );
        return shuffledDeck;
      }

      return {
        generateVeryEasyNumbersDobbleDeck,
      };
    })();

    return {
      generateBeginnerNumbersDobbleDeck:
        BeginnerNumbersLogic.generateBeginnerNumbersDobbleDeck,
      generateVeryEasyNumbersDobbleDeck:
        VeryEasyNumbersLogic.generateVeryEasyNumbersDobbleDeck,
    };
  })();

  // Підмодуль "Логіка для зображень" через IIFE (без змін)
  const ImagesLogic = (function () {
    const BeginnerImagesLogic = (function () {
      function generateBeginnerImagesDobbleDeck(numberOfSymbols, theme) {
        const n = numberOfSymbols - 1;
        const totalCards = n * n + n + 1;
        const totalSymbols = n * n + n + 1;
        const extension = theme === "classic" ? ".svg" : ".png";
        const symbols = Array.from(
          { length: totalSymbols },
          (_, index) => `${index + 1}${extension}`
        );
        const deck = [];

        deck.push(symbols.slice(0, numberOfSymbols));
        for (let i = 0; i < n; i++) {
          const card = [symbols[0]];
          for (let j = 0; j < n; j++) {
            card.push(symbols[n + 1 + i * n + j]);
          }
          deck.push(card);
        }
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const card = [symbols[i + 1]];
            for (let k = 0; k < n; k++) {
              card.push(symbols[n + 1 + n * k + ((i * k + j) % n)]);
            }
            deck.push(card);
          }
        }
        console.log(
          "Згенерована колода (Початковий рівень, Зображення):",
          deck
        );
        return deck;
      }

      function prepareCards(leftCardIndex, rightCardIndex, deck, isFirstPair) {
        if (leftCardIndex === null || rightCardIndex === null) return;

        let leftCard = deck[leftCardIndex];
        let rightCard = deck[rightCardIndex];

        const commonSymbol = findCommonSymbol(leftCard, rightCard);
        if (!commonSymbol) {
          console.error("Спільний символ не знайдено!");
          return { leftCard, rightCard };
        }

        const leftIndex = leftCard.indexOf(commonSymbol);
        const rightIndex = rightCard.indexOf(commonSymbol);

        if (leftIndex === rightIndex) {
          return { leftCard, rightCard };
        }

        let alignedRightCard = [...rightCard];
        alignedRightCard.splice(rightIndex, 1);
        alignedRightCard.splice(leftIndex, 0, commonSymbol);

        deck[rightCardIndex] = alignedRightCard;
        return { leftCard, rightCard: alignedRightCard };
      }

      function findCommonSymbol(leftCard, rightCard) {
        return leftCard.find((symbol) => rightCard.includes(symbol));
      }

      return {
        generateBeginnerImagesDobbleDeck,
        prepareCards,
      };
    })();

    const VeryEasyImagesLogic = (function () {
      function generateVeryEasyImagesDobbleDeck(numberOfSymbols, theme) {
        function shuffleArray(array) {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        }
        const beginnerDeck =
          BeginnerImagesLogic.generateBeginnerImagesDobbleDeck(
            numberOfSymbols,
            theme
          );
        const shuffledDeck = beginnerDeck.map((card) => shuffleArray(card));
        console.log(
          "Згенерована колода (Дуже легкий рівень, Зображення):",
          shuffledDeck
        );
        return shuffledDeck;
      }

      return {
        generateVeryEasyImagesDobbleDeck,
      };
    })();

    return {
      generateBeginnerImagesDobbleDeck:
        BeginnerImagesLogic.generateBeginnerImagesDobbleDeck,
      generateVeryEasyImagesDobbleDeck:
        VeryEasyImagesLogic.generateVeryEasyImagesDobbleDeck,
      BeginnerImagesLogic: BeginnerImagesLogic,
    };
  })();

  // Підмодуль "Логіка для ієрогліфів" через IIFE (без змін)
  const HieroglyphsLogic = (function () {
    const BeginnerHieroglyphsLogic = (function () {
      function generateBeginnerHieroglyphsDobbleDeck(numberOfSymbols) {
        const n = numberOfSymbols - 1;
        const totalCards = n * n + n + 1;
        const totalSymbolsNeeded = n * n + n + 1;

        if (totalSymbolsNeeded > hieroglyphsList.length) {
          console.error("Недостатньо ієрогліфів для генерації колоди!");
          return [];
        }

        const symbols = hieroglyphsList.slice(0, totalSymbolsNeeded);
        const deck = [];

        deck.push(symbols.slice(0, numberOfSymbols));
        for (let i = 0; i < n; i++) {
          const card = [symbols[0]];
          for (let j = 0; j < n; j++) {
            card.push(symbols[n + 1 + i * n + j]);
          }
          deck.push(card);
        }
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const card = [symbols[i + 1]];
            for (let k = 0; k < n; k++) {
              card.push(symbols[n + 1 + n * k + ((i * k + j) % n)]);
            }
            deck.push(card);
          }
        }
        console.log("Згенерована колода (Початковий рівень, Ієрогліфи):", deck);
        return deck;
      }

      function findCommonSymbol(leftCard, rightCard) {
        return leftCard.find((symbol) => rightCard.includes(symbol));
      }

      function alignCommonSymbol(leftCard, rightCard, rightCardIndex, deck) {
        const commonSymbol = findCommonSymbol(leftCard, rightCard);
        if (!commonSymbol) {
          console.error("Спільний ієрогліф не знайдено!");
          return rightCard;
        }

        const leftIndex = leftCard.indexOf(commonSymbol);
        const rightIndex = rightCard.indexOf(commonSymbol);

        if (leftIndex === rightIndex) {
          return rightCard;
        }

        let alignedRightCard = [...rightCard];
        alignedRightCard.splice(rightIndex, 1);
        alignedRightCard.splice(leftIndex, 0, commonSymbol);

        deck[rightCardIndex] = alignedRightCard;
        return alignedRightCard;
      }

      function prepareCards(leftCardIndex, rightCardIndex, deck, isFirstPair) {
        if (leftCardIndex === null || rightCardIndex === null) return;

        let leftCard = deck[leftCardIndex];
        let rightCard = deck[rightCardIndex];

        rightCard = alignCommonSymbol(
          leftCard,
          rightCard,
          rightCardIndex,
          deck
        );
        return { leftCard, rightCard };
      }

      return {
        generateBeginnerHieroglyphsDobbleDeck,
        prepareCards,
      };
    })();

    const VeryEasyHieroglyphsLogic = (function () {
      function generateVeryEasyHieroglyphsDobbleDeck(numberOfSymbols) {
        function shuffleArray(array) {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        }
        const beginnerDeck =
          BeginnerHieroglyphsLogic.generateBeginnerHieroglyphsDobbleDeck(
            numberOfSymbols
          );
        const shuffledDeck = beginnerDeck.map((card) => shuffleArray(card));
        console.log(
          "Згенерована колода (Дуже легкий рівень, Ієрогліфи):",
          shuffledDeck
        );
        return shuffledDeck;
      }

      return {
        generateVeryEasyHieroglyphsDobbleDeck,
      };
    })();

    return {
      generateBeginnerHieroglyphsDobbleDeck:
        BeginnerHieroglyphsLogic.generateBeginnerHieroglyphsDobbleDeck,
      generateVeryEasyHieroglyphsDobbleDeck:
        VeryEasyHieroglyphsLogic.generateVeryEasyHieroglyphsDobbleDeck,
      BeginnerHieroglyphsLogic: BeginnerHieroglyphsLogic,
    };
  })();

  // Новий підмодуль "Логіка для слів" через IIFE
  const WordsLogic = (function () {
    const BeginnerWordsLogic = (function () {
      function generateBeginnerWordsDobbleDeck(numberOfSymbols) {
        const n = numberOfSymbols - 1;
        const totalCards = n * n + n + 1;
        const totalSymbolsNeeded = n * n + n + 1;

        if (totalSymbolsNeeded > wordsList.length) {
          console.error("Недостатньо слів для генерації колоди!");
          return [];
        }

        const symbols = wordsList.slice(0, totalSymbolsNeeded);
        const deck = [];

        deck.push(symbols.slice(0, numberOfSymbols));
        for (let i = 0; i < n; i++) {
          const card = [symbols[0]];
          for (let j = 0; j < n; j++) {
            card.push(symbols[n + 1 + i * n + j]);
          }
          deck.push(card);
        }
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const card = [symbols[i + 1]];
            for (let k = 0; k < n; k++) {
              card.push(symbols[n + 1 + n * k + ((i * k + j) % n)]);
            }
            deck.push(card);
          }
        }
        console.log("Згенерована колода (Початковий рівень, Слова):", deck);
        return deck;
      }

      function findCommonSymbol(leftCard, rightCard) {
        return leftCard.find((symbol) => rightCard.includes(symbol));
      }

      function alignCommonSymbol(leftCard, rightCard, rightCardIndex, deck) {
        const commonSymbol = findCommonSymbol(leftCard, rightCard);
        if (!commonSymbol) {
          console.error("Спільне слово не знайдено!");
          return rightCard;
        }

        const leftIndex = leftCard.indexOf(commonSymbol);
        const rightIndex = rightCard.indexOf(commonSymbol);

        if (leftIndex === rightIndex) {
          return rightCard;
        }

        let alignedRightCard = [...rightCard];
        alignedRightCard.splice(rightIndex, 1);
        alignedRightCard.splice(leftIndex, 0, commonSymbol);

        deck[rightCardIndex] = alignedRightCard;
        return alignedRightCard;
      }

      function prepareCards(leftCardIndex, rightCardIndex, deck, isFirstPair) {
        if (leftCardIndex === null || rightCardIndex === null) return;

        let leftCard = deck[leftCardIndex];
        let rightCard = deck[rightCardIndex];

        rightCard = alignCommonSymbol(
          leftCard,
          rightCard,
          rightCardIndex,
          deck
        );
        return { leftCard, rightCard };
      }

      return {
        generateBeginnerWordsDobbleDeck,
        prepareCards,
      };
    })();

    const VeryEasyWordsLogic = (function () {
      function generateVeryEasyWordsDobbleDeck(numberOfSymbols) {
        function shuffleArray(array) {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        }
        const beginnerDeck =
          BeginnerWordsLogic.generateBeginnerWordsDobbleDeck(numberOfSymbols);
        const shuffledDeck = beginnerDeck.map((card) => shuffleArray(card));
        console.log(
          "Згенерована колода (Дуже легкий рівень, Слова):",
          shuffledDeck
        );
        return shuffledDeck;
      }

      return {
        generateVeryEasyWordsDobbleDeck,
      };
    })();

    return {
      generateBeginnerWordsDobbleDeck:
        BeginnerWordsLogic.generateBeginnerWordsDobbleDeck,
      generateVeryEasyWordsDobbleDeck:
        VeryEasyWordsLogic.generateVeryEasyWordsDobbleDeck,
      BeginnerWordsLogic: BeginnerWordsLogic,
    };
  })();

  // Підмодуль "Ядро складності"
  const CoreDifficulty = (function () {
    function updateDifficultyOptions(category) {
      let options = "";
      if (
        category === "numbers" ||
        category === "images" ||
        category === "hieroglyphs" ||
        category === "words"
      ) {
        options = `
          <option value="beginner" selected>Початковий</option>
          <option value="veryEasy">Дуже легкий</option>
        `;
      }
      difficultyLevelSelect.innerHTML = options;
    }

    return {
      updateDifficultyOptions,
      getDifficulty: () => difficultyLevelSelect.value,
    };
  })();

  // Підмодуль "Генератор колоди"
  const DeckDifficultyGenerator = (function () {
    function shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    function generateDeck(category, difficulty, numberOfSymbols, theme) {
      let deck = [];

      const requiredSymbols =
        numberOfSymbols * numberOfSymbols - numberOfSymbols + 1;
      if (
        category === "hieroglyphs" &&
        requiredSymbols > hieroglyphsList.length
      ) {
        alert(
          `Недостатньо ієрогліфів! Потрібно ${requiredSymbols}, доступно ${hieroglyphsList.length}.`
        );
        return deck;
      }
      if (category === "words" && requiredSymbols > wordsList.length) {
        alert(
          `Недостатньо слів! Потрібно ${requiredSymbols}, доступно ${wordsList.length}.`
        );
        return deck;
      }

      if (category === "numbers") {
        if (difficulty === "beginner") {
          deck =
            NumbersLogic.generateBeginnerNumbersDobbleDeck(numberOfSymbols);
        } else if (difficulty === "veryEasy") {
          deck =
            NumbersLogic.generateVeryEasyNumbersDobbleDeck(numberOfSymbols);
        }
      } else if (category === "images") {
        if (difficulty === "beginner") {
          deck = ImagesLogic.generateBeginnerImagesDobbleDeck(
            numberOfSymbols,
            theme
          );
        } else if (difficulty === "veryEasy") {
          deck = ImagesLogic.generateVeryEasyImagesDobbleDeck(
            numberOfSymbols,
            theme
          );
        }
      } else if (category === "hieroglyphs") {
        if (difficulty === "beginner") {
          deck =
            HieroglyphsLogic.generateBeginnerHieroglyphsDobbleDeck(
              numberOfSymbols
            );
        } else if (difficulty === "veryEasy") {
          deck =
            HieroglyphsLogic.generateVeryEasyHieroglyphsDobbleDeck(
              numberOfSymbols
            );
        }
      } else if (category === "words") {
        if (difficulty === "beginner") {
          deck = WordsLogic.generateBeginnerWordsDobbleDeck(numberOfSymbols);
        } else if (difficulty === "veryEasy") {
          deck = WordsLogic.generateVeryEasyWordsDobbleDeck(numberOfSymbols);
        }
      }
      return deck;
    }

    return {
      generateDeck,
    };
  })();

  elementCategorySelect.addEventListener("change", () => {
    CoreDifficulty.updateDifficultyOptions(elementCategorySelect.value);
  });

  return {
    getDifficulty: CoreDifficulty.getDifficulty,
    updateDifficultyOptions: CoreDifficulty.updateDifficultyOptions,
    generateDeck: DeckDifficultyGenerator.generateDeck,
    ImageBeginnerLogic: ImagesLogic.BeginnerImagesLogic,
    HieroglyphsBeginnerLogic: HieroglyphsLogic.BeginnerHieroglyphsLogic,
    WordsBeginnerLogic: WordsLogic.BeginnerWordsLogic,
  };
})();

// Модуль "Ядро підказок" через IIFE
const HintsCoreModule = (function () {
  // Модуль "Показати колоду" через IIFE
  const DeckModule = (function () {
    let lastHighlightedInitialCardIndex = null;
    let lastHighlightedUsedCardIndex = null;

    // Визначаємо розміри символів залежно від ширини екрана
    function getSymbolSize() {
      if (window.innerWidth >= 1280) return 35;
      if (window.innerWidth >= 768) return 32;
      return 28; // 320px
    }

    // IIFE для Логіки 1: Підсвічування всіх карток
    const HighlightMode1 = (function () {
      function highlight(selectedCardIndex, dobbleDeck, category) {
        const initialDeckDisplay = StateModule.getDOMCache().initialDeckDisplay;
        const usedDeckDisplay = StateModule.getDOMCache().usedDeckDisplay;
        if (!initialDeckDisplay || !usedDeckDisplay) {
          console.warn("Deck displays not found");
          return;
        }

        const selectedCardSymbols = dobbleDeck[selectedCardIndex];
        const allDeckCards = [
          ...initialDeckDisplay.querySelectorAll(".deck-card"),
          ...usedDeckDisplay.querySelectorAll(".deck-card"),
        ];
        const symbolColors = {};
        DeckModule.clearDeckHighlighting();

        const availableColors = [
          "lightblue",
          "lightgreen",
          "lightcoral",
          "plum",
          "lightpink",
          "cyan",
          "teal",
          "lightsalmon",
          "lightseagreen",
          "lightskyblue",
          "lightslategray",
          "lightsteelblue",
          "gold",
          "darkseagreen",
          "lavender",
          "peachpuff",
          "thistle",
          "powderblue",
          "palegoldenrod",
          "moccasin",
          "cornflowerblue",
          "mediumaquamarine",
          "rosybrown",
          "mediumpurple",
          "darkkhaki",
          "darkcyan",
          "cadetblue",
          "orchid",
          "sandybrown",
          "mediumseagreen",
          "palevioletred",
          "skyblue",
          "goldenrod",
          "burlywood",
          "slateblue",
          "darkolivegreen",
          "peru",
          "indianred",
          "seagreen",
          "steelblue",
          "violet",
          "tan",
          "chocolate",
          "darkslateblue",
          "salmon",
          "mediumslateblue",
          "olivedrab",
          "darkgoldenrod",
          "coral",
          "dodgerblue",
          "khaki",
          "mediumturquoise",
          "sienna",
        ];

        dobbleDeck.forEach((cardSymbols, cardIndex) => {
          const matchingSymbols = cardSymbols.filter((symbol) =>
            selectedCardSymbols.includes(symbol)
          );
          const card = Array.from(allDeckCards).find(
            (cardElement) => parseInt(cardElement.dataset.index) === cardIndex
          );

          if (matchingSymbols.length > 0 && card) {
            card.querySelectorAll(".deck-symbol").forEach((symbol) => {
              const symbolValue = getSymbolValue(symbol, category);
              if (matchingSymbols.includes(symbolValue)) {
                if (!symbolColors[symbolValue]) {
                  symbolColors[symbolValue] =
                    availableColors[
                      Object.keys(symbolColors).length % availableColors.length
                    ];
                }
                symbol.classList.add("highlighted");
                symbol.style.setProperty(
                  "--highlight-color",
                  symbolColors[symbolValue]
                );
              }
            });
          }
        });
      }

      return { highlight };
    })();

    // IIFE для Логіки 2: Роздільне підсвічування
    const HighlightMode2 = (function () {
      function highlight(selectedCardIndex, dobbleDeck, category) {
        const initialDeckDisplay = StateModule.getDOMCache().initialDeckDisplay;
        const usedDeckDisplay = StateModule.getDOMCache().usedDeckDisplay;
        if (!initialDeckDisplay || !usedDeckDisplay) {
          console.warn("Deck displays not found");
          return;
        }

        const selectedCardSymbols = dobbleDeck[selectedCardIndex];
        const availableColors = [
          "lightblue",
          "lightgreen",
          "lightcoral",
          "plum",
          "lightpink",
          "cyan",
          "teal",
          "lightsalmon",
          "lightseagreen",
          "lightskyblue",
          "lightslategray",
          "lightsteelblue",
          "gold",
          "darkseagreen",
          "lavender",
          "peachpuff",
          "thistle",
          "powderblue",
          "palegoldenrod",
          "moccasin",
          "cornflowerblue",
          "mediumaquamarine",
          "rosybrown",
          "mediumpurple",
          "darkkhaki",
          "darkcyan",
          "cadetblue",
          "orchid",
          "sandybrown",
          "mediumseagreen",
          "palevioletred",
          "skyblue",
          "goldenrod",
          "burlywood",
          "slateblue",
          "darkolivegreen",
          "peru",
          "indianred",
          "seagreen",
          "steelblue",
          "violet",
          "tan",
          "chocolate",
          "darkslateblue",
          "salmon",
          "mediumslateblue",
          "olivedrab",
          "darkgoldenrod",
          "coral",
          "dodgerblue",
          "khaki",
          "mediumturquoise",
          "sienna",
        ];

        const isInitialDeck = initialDeckDisplay.querySelector(
          `.deck-card[data-index="${selectedCardIndex}"]`
        );
        if (isInitialDeck) {
          const initialDeckCards =
            initialDeckDisplay.querySelectorAll(".deck-card");
          const symbolColors = {};

          initialDeckCards.forEach((card) => {
            card.querySelectorAll(".deck-symbol").forEach((symbol) => {
              symbol.classList.remove("highlighted");
              symbol.style.removeProperty("--highlight-color");
            });
          });

          dobbleDeck.forEach((cardSymbols, cardIndex) => {
            const matchingSymbols = cardSymbols.filter((symbol) =>
              selectedCardSymbols.includes(symbol)
            );
            const card = Array.from(initialDeckCards).find(
              (c) => parseInt(c.dataset.index) === cardIndex
            );
            if (matchingSymbols.length > 0 && card) {
              card.querySelectorAll(".deck-symbol").forEach((symbol) => {
                let symbolValue = getSymbolValue(symbol, category);
                if (
                  symbolValue !== null &&
                  matchingSymbols.includes(symbolValue)
                ) {
                  if (!symbolColors[symbolValue]) {
                    symbolColors[symbolValue] =
                      availableColors[
                        Object.keys(symbolColors).length %
                          availableColors.length
                      ];
                  }
                  symbol.classList.add("highlighted");
                  symbol.style.setProperty(
                    "--highlight-color",
                    symbolColors[symbolValue]
                  );
                }
              });
            }
          });
        } else {
          const usedDeckCards = usedDeckDisplay.querySelectorAll(".deck-card");
          const card = Array.from(usedDeckCards).find(
            (c) => parseInt(c.dataset.index) === selectedCardIndex
          );
          if (card) {
            const symbolColorsHistory = {};
            usedDeckCards.forEach((card) => {
              card.querySelectorAll(".deck-symbol").forEach((symbol) => {
                symbol.classList.remove("highlighted");
                symbol.style.removeProperty("--highlight-color");
              });
            });

            usedDeckCards.forEach((usedCard, cardPosition) => {
              const cardIndex = parseInt(usedCard.dataset.index);
              const cardSymbols = dobbleDeck[cardIndex];
              const highlightedSymbols = [];

              usedCard.querySelectorAll(".deck-symbol").forEach((symbol) => {
                let symbolValue = getSymbolValue(symbol, category);

                let shouldHighlight = false;
                let isCommonWithPrev = false;
                let isCommonWithNext = false;
                let prevColor = null;

                if (cardPosition > 0) {
                  const prevCardIndex = parseInt(
                    usedDeckCards[cardPosition - 1].dataset.index
                  );
                  const prevCardSymbols = dobbleDeck[prevCardIndex];
                  isCommonWithPrev = prevCardSymbols.includes(symbolValue);
                  if (isCommonWithPrev) {
                    const prevSymbolElement = Array.from(
                      usedDeckCards[cardPosition - 1].querySelectorAll(
                        ".deck-symbol"
                      )
                    ).find((s) => getSymbolValue(s, category) === symbolValue);
                    prevColor =
                      prevSymbolElement?.style.getPropertyValue(
                        "--highlight-color"
                      ) || symbolColorsHistory[symbolValue];
                  }
                }

                if (cardPosition < usedDeckCards.length - 1) {
                  const nextCardIndex = parseInt(
                    usedDeckCards[cardPosition + 1].dataset.index
                  );
                  const nextCardSymbols = dobbleDeck[nextCardIndex];
                  isCommonWithNext = nextCardSymbols.includes(symbolValue);
                }

                shouldHighlight = isCommonWithPrev || isCommonWithNext;

                if (shouldHighlight) {
                  symbol.classList.add("highlighted");
                  highlightedSymbols.push({
                    symbol: symbol,
                    value: symbolValue,
                  });

                  if (cardPosition === 0) {
                    symbol.style.setProperty("--highlight-color", "#a5d6a7");
                    symbolColorsHistory[symbolValue] = "#a5d6a7";
                  } else {
                    if (isCommonWithPrev) {
                      symbol.style.setProperty("--highlight-color", prevColor);
                      symbolColorsHistory[symbolValue] = prevColor;
                    } else if (isCommonWithNext) {
                      let newColor;
                      const prevCardSymbols =
                        dobbleDeck[
                          parseInt(
                            usedDeckCards[cardPosition - 1].dataset.index
                          )
                        ];
                      const prevHighlightedSymbol = prevCardSymbols.find((s) =>
                        Array.from(
                          usedDeckCards[cardPosition - 1].querySelectorAll(
                            ".deck-symbol"
                          )
                        )
                          .find((el) => el.classList.contains("highlighted"))
                          ?.textContent.includes(s)
                      );
                      const prevSymbolElement = Array.from(
                        usedDeckCards[cardPosition - 1].querySelectorAll(
                          ".deck-symbol"
                        )
                      ).find(
                        (s) =>
                          getSymbolValue(s, category) === prevHighlightedSymbol
                      );
                      const prevColorForNew =
                        prevSymbolElement?.style.getPropertyValue(
                          "--highlight-color"
                        ) || "#a5d6a7";
                      newColor =
                        prevColorForNew === "#a5d6a7" ? "#87ceeb" : "#a5d6a7";
                      symbol.style.setProperty("--highlight-color", newColor);
                      symbolColorsHistory[symbolValue] = newColor;
                    }
                  }
                }
              });

              if (highlightedSymbols.length === 2) {
                const [firstSymbol, secondSymbol] = highlightedSymbols;
                let firstColor =
                  firstSymbol.symbol.style.getPropertyValue(
                    "--highlight-color"
                  );
                let secondColor =
                  secondSymbol.symbol.style.getPropertyValue(
                    "--highlight-color"
                  );

                if (
                  firstColor === secondColor &&
                  firstSymbol.value !== secondSymbol.value
                ) {
                  const prevCardIndex =
                    cardPosition > 0
                      ? parseInt(usedDeckCards[cardPosition - 1].dataset.index)
                      : null;
                  const prevCardSymbols =
                    prevCardIndex !== null ? dobbleDeck[prevCardIndex] : [];
                  const isFirstCommonWithPrev = prevCardSymbols.includes(
                    firstSymbol.value
                  );
                  const isSecondCommonWithPrev = prevCardSymbols.includes(
                    secondSymbol.value
                  );

                  if (isFirstCommonWithPrev) {
                    const newSecondColor =
                      firstColor === "#a5d6a7" ? "#87ceeb" : "#a5d6a7";
                    secondSymbol.symbol.style.setProperty(
                      "--highlight-color",
                      newSecondColor
                    );
                    symbolColorsHistory[secondSymbol.value] = newSecondColor;
                  } else if (isSecondCommonWithPrev) {
                    const newFirstColor =
                      secondColor === "#a5d6a7" ? "#87ceeb" : "#a5d6a7";
                    firstSymbol.symbol.style.setProperty(
                      "--highlight-color",
                      newFirstColor
                    );
                    symbolColorsHistory[firstSymbol.value] = newFirstColor;
                  } else {
                    const newSecondColor =
                      firstColor === "#a5d6a7" ? "#87ceeb" : "#a5d6a7";
                    secondSymbol.symbol.style.setProperty(
                      "--highlight-color",
                      newSecondColor
                    );
                    symbolColorsHistory[secondSymbol.value] = newSecondColor;
                  }
                }
              }
            });
          }
        }
      }

      return { highlight };
    })();

    function displayDeck(
      category,
      deckData,
      usedCardsData,
      leftIdx,
      rightIdx,
      theme
    ) {
      const initialDeckDisplay = StateModule.getDOMCache().initialDeckDisplay;
      const usedDeckDisplay = StateModule.getDOMCache().usedDeckDisplay;
      if (!initialDeckDisplay || !usedDeckDisplay) {
        console.warn("Deck displays not found");
        return;
      }

      const highlightedSymbolsInitial = new Map();
      const highlightedSymbolsUsed = new Map();
      if (document.getElementById("highlightCheckbox")?.checked) {
        initialDeckDisplay
          .querySelectorAll(".deck-symbol.highlighted")
          .forEach((symbol) => {
            const symbolValue = getSymbolValue(symbol, category);
            highlightedSymbolsInitial.set(
              symbolValue,
              symbol.style.getPropertyValue("--highlight-color")
            );
          });
        usedDeckDisplay
          .querySelectorAll(".deck-symbol.highlighted")
          .forEach((symbol) => {
            const symbolValue = getSymbolValue(symbol, category);
            highlightedSymbolsUsed.set(
              symbolValue,
              symbol.style.getPropertyValue("--highlight-color")
            );
          });
      }

      initialDeckDisplay.innerHTML = "";

      deckData.forEach((cardSymbols, cardIndex) => {
        if (!usedCardsData.includes(cardIndex)) {
          const card = document.createElement("div");
          card.classList.add("deck-card");
          card.dataset.index = cardIndex;

          cardSymbols.forEach((symbol) => {
            const symbolDiv = createSymbolDiv(symbol, category, theme);
            card.appendChild(symbolDiv);

            if (highlightedSymbolsInitial.has(symbol)) {
              symbolDiv.classList.add("highlighted");
              symbolDiv.style.setProperty(
                "--highlight-color",
                highlightedSymbolsInitial.get(symbol)
              );
            }
          });

          if (cardIndex === leftIdx || cardIndex === rightIdx) {
            card.classList.add("in-game");
          }
          initialDeckDisplay.appendChild(card);
        }
      });

      const existingUsedCards = new Set(
        Array.from(usedDeckDisplay.querySelectorAll(".deck-card")).map((card) =>
          parseInt(card.dataset.index)
        )
      );
      usedCardsData.forEach((cardIndex) => {
        if (!existingUsedCards.has(cardIndex)) {
          const card = document.createElement("div");
          card.classList.add("deck-card", "used-card");
          card.dataset.index = cardIndex;

          deckData[cardIndex].forEach((symbol) => {
            const symbolDiv = createSymbolDiv(symbol, category, theme);
            card.appendChild(symbolDiv);

            if (highlightedSymbolsUsed.has(symbol)) {
              symbolDiv.classList.add("highlighted");
              symbolDiv.style.setProperty(
                "--highlight-color",
                highlightedSymbolsUsed.get(symbol)
              );
            }
          });

          usedDeckDisplay.appendChild(card);
        }
      });

      if (document.getElementById("highlightCheckbox")?.checked) {
        const mode = document.getElementById("highlightMode1")?.checked
          ? "mode1"
          : "mode2";
        if (
          mode === "mode1" &&
          (lastHighlightedInitialCardIndex !== null ||
            lastHighlightedUsedCardIndex !== null)
        ) {
          HighlightMode1.highlight(
            lastHighlightedInitialCardIndex !== null
              ? lastHighlightedInitialCardIndex
              : lastHighlightedUsedCardIndex,
            deckData,
            category
          );
        } else if (mode === "mode2") {
          if (lastHighlightedInitialCardIndex !== null) {
            HighlightMode2.highlight(
              lastHighlightedInitialCardIndex,
              deckData,
              category
            );
          }
          if (lastHighlightedUsedCardIndex !== null) {
            HighlightMode2.highlight(
              lastHighlightedUsedCardIndex,
              deckData,
              category
            );
          }
        }
      }
    }

    function createSymbolDiv(symbol, category, theme) {
      const symbolDiv = document.createElement("div");
      symbolDiv.classList.add("deck-symbol");
      if (category === "numbers") symbolDiv.classList.add("number");
      else if (category === "hieroglyphs")
        symbolDiv.classList.add("hieroglyph");
      else if (category === "words") symbolDiv.classList.add("word");
      else if (category === "images") symbolDiv.classList.add("image");

      const size = getSymbolSize();
      symbolDiv.style.width = `${size}px`;
      symbolDiv.style.height = `${size}px`;
      symbolDiv.style.lineHeight = `${size}px`;
      symbolDiv.style.fontSize = category === "words" ? "12px" : "16px";

      if (
        category === "numbers" ||
        category === "hieroglyphs" ||
        category === "words"
      ) {
        symbolDiv.textContent = symbol;
      } else if (category === "images") {
        const img = document.createElement("img");
        img.src = `resource/images/${theme}/${symbol}`;
        img.style.width = "100%";
        img.style.height = "100%";
        img.onerror = () => {
          img.alt = "Зображення не знайдено";
          img.src = "resource/images/default.png";
          console.warn(`Не вдалося завантажити зображення: ${img.src}`);
        };
        symbolDiv.appendChild(img);
      }
      return symbolDiv;
    }

    function getSymbolValue(symbolElement, category) {
      if (!symbolElement) return null;
      if (category === "numbers")
        return parseInt(symbolElement.textContent.trim());
      if (category === "images")
        return symbolElement.querySelector("img")?.src.split("/").pop();
      return symbolElement.textContent.trim();
    }

    function moveCardToUsedDeck(cardIndex) {
      const initialDeckDisplay = StateModule.getDOMCache().initialDeckDisplay;
      if (!initialDeckDisplay) {
        console.warn("Initial deck display not found");
        return;
      }

      const initialCards = initialDeckDisplay.querySelectorAll(".deck-card");
      const cardToMove = Array.from(initialCards).find(
        (card) => parseInt(card.dataset.index) === cardIndex
      );
      if (cardToMove) {
        console.log(
          `Переміщення картки з індексом ${cardIndex} до usedDeckDisplay`
        );
        initialDeckDisplay.removeChild(cardToMove);
        cardToMove.classList.remove("in-game");
        cardToMove.classList.add("used-card");

        const highlightMode = document.getElementById("highlightMode1")?.checked
          ? "mode1"
          : "mode2";
        if (document.getElementById("highlightCheckbox")?.checked) {
          const highlightedSymbols = new Map();
          cardToMove
            .querySelectorAll(".deck-symbol.highlighted")
            .forEach((symbol) => {
              const symbolValue = getSymbolValue(
                symbol,
                MainModalModule.getCategory()
              );
              highlightedSymbols.set(
                symbolValue,
                symbol.style.getPropertyValue("--highlight-color")
              );
            });

          if (highlightMode === "mode2") {
            cardToMove.querySelectorAll(".deck-symbol").forEach((symbol) => {
              symbol.classList.remove("highlighted");
              symbol.style.removeProperty("--highlight-color");
            });
            if (lastHighlightedUsedCardIndex !== null) {
              HighlightMode2.highlight(
                lastHighlightedUsedCardIndex,
                StateModule.getGameState().deck,
                MainModalModule.getCategory()
              );
            }
          }

          StateModule.getDOMCache().usedDeckDisplay.appendChild(cardToMove);

          if (
            highlightMode === "mode1" &&
            lastHighlightedInitialCardIndex === cardIndex
          ) {
            lastHighlightedUsedCardIndex = cardIndex;
            lastHighlightedInitialCardIndex = null;
            HighlightMode1.highlight(
              cardIndex,
              StateModule.getGameState().deck,
              MainModalModule.getCategory()
            );
          } else if (
            highlightMode === "mode2" &&
            lastHighlightedInitialCardIndex === cardIndex
          ) {
            lastHighlightedInitialCardIndex = null;
          }
        } else {
          StateModule.getDOMCache().usedDeckDisplay.appendChild(cardToMove);
        }
      }
    }

    function highlightMatchingSymbols(selectedCardIndex, dobbleDeck, category) {
      if (!document.getElementById("highlightCheckbox")?.checked) {
        clearDeckHighlighting();
        return;
      }

      const highlightMode = document.getElementById("highlightMode1")?.checked
        ? "mode1"
        : "mode2";
      if (highlightMode === "mode1") {
        HighlightMode1.highlight(selectedCardIndex, dobbleDeck, category);
      } else {
        HighlightMode2.highlight(selectedCardIndex, dobbleDeck, category);
      }
    }

    function clearDeckHighlighting(block = null) {
      const selector = block ? `${block} .deck-symbol` : ".deck-symbol";
      document.querySelectorAll(selector).forEach((symbol) => {
        symbol.classList.remove("highlighted");
        symbol.style.removeProperty("--highlight-color");
      });
    }

    function updateInGameHighlighting(leftIdx, rightIdx) {
      const initialDeckDisplay = StateModule.getDOMCache().initialDeckDisplay;
      if (!initialDeckDisplay) {
        console.warn("Initial deck display not found");
        return;
      }

      const allInitialCards = initialDeckDisplay.querySelectorAll(".deck-card");
      allInitialCards.forEach((card) => {
        const cardIndex = parseInt(card.dataset.index);
        if (cardIndex === leftIdx || cardIndex === rightIdx) {
          card.classList.add("in-game");
        } else {
          card.classList.remove("in-game");
        }
      });
    }

    function initializeEventListeners() {
      const showDeckCheckbox = document.getElementById("showDeckCheckbox");
      const highlightCheckbox = document.getElementById("highlightCheckbox");
      const initialDeckDisplay = StateModule.getDOMCache().initialDeckDisplay;
      const usedDeckDisplay = StateModule.getDOMCache().usedDeckDisplay;

      if (showDeckCheckbox) {
        showDeckCheckbox.addEventListener("change", function () {
          const isChecked = this.checked;
          document.getElementById("highlightCheckboxLabel").style.display =
            isChecked ? "block" : "none";
          if (!isChecked) {
            highlightCheckbox.checked = false;
            document.getElementById("highlightOptions").style.display = "none";
            clearDeckHighlighting();
            lastHighlightedInitialCardIndex = null;
            lastHighlightedUsedCardIndex = null;
          }
        });
      }

      if (highlightCheckbox) {
        highlightCheckbox.addEventListener("change", function () {
          const isChecked = this.checked;
          document.getElementById("highlightOptions").style.display =
            isChecked && MainModalModule.getShowDeck() ? "block" : "none";
          if (!isChecked) {
            clearDeckHighlighting();
            lastHighlightedInitialCardIndex = null;
            lastHighlightedUsedCardIndex = null;
          }
        });
      }

      if (initialDeckDisplay) {
        initialDeckDisplay.addEventListener("click", (event) => {
          const deckCard = event.target.closest(".deck-card");
          if (deckCard && !deckCard.classList.contains("used-card")) {
            const selectedCardIndex = parseInt(deckCard.dataset.index);
            console.log(
              `Клікнуто картку з індексом ${selectedCardIndex} у початковій колоді`
            );

            if (!highlightCheckbox?.checked) return;

            const mode = document.getElementById("highlightMode1")?.checked
              ? "mode1"
              : "mode2";
            if (
              lastHighlightedInitialCardIndex === selectedCardIndex &&
              mode === "mode1"
            ) {
              clearDeckHighlighting();
              lastHighlightedInitialCardIndex = null;
              lastHighlightedUsedCardIndex = null;
            } else if (
              lastHighlightedInitialCardIndex === selectedCardIndex &&
              mode === "mode2"
            ) {
              clearDeckHighlighting("#initialDeckDisplay");
              lastHighlightedInitialCardIndex = null;
            } else {
              if (mode === "mode2")
                clearDeckHighlighting("#initialDeckDisplay");
              else if (lastHighlightedInitialCardIndex !== selectedCardIndex)
                clearDeckHighlighting();
              lastHighlightedInitialCardIndex = selectedCardIndex;
              lastHighlightedUsedCardIndex = null;
              highlightMatchingSymbols(
                selectedCardIndex,
                StateModule.getGameState().deck,
                MainModalModule.getCategory()
              );
            }
          }
        });
      }

      if (usedDeckDisplay) {
        usedDeckDisplay.addEventListener("click", (event) => {
          const deckCard = event.target.closest(".deck-card");
          if (deckCard && deckCard.classList.contains("used-card")) {
            const selectedCardIndex = parseInt(deckCard.dataset.index);
            console.log(
              `Клікнуто картку з індексом ${selectedCardIndex} у використаній колоді`
            );

            if (!highlightCheckbox?.checked) return;

            const mode = document.getElementById("highlightMode1")?.checked
              ? "mode1"
              : "mode2";
            if (
              lastHighlightedUsedCardIndex === selectedCardIndex &&
              mode === "mode1"
            ) {
              clearDeckHighlighting();
              lastHighlightedInitialCardIndex = null;
              lastHighlightedUsedCardIndex = null;
            } else if (
              lastHighlightedUsedCardIndex === selectedCardIndex &&
              mode === "mode2"
            ) {
              clearDeckHighlighting("#usedDeckDisplay");
              lastHighlightedUsedCardIndex = null;
            } else {
              if (mode === "mode2") clearDeckHighlighting("#usedDeckDisplay");
              else if (lastHighlightedUsedCardIndex !== selectedCardIndex)
                clearDeckHighlighting();
              lastHighlightedUsedCardIndex = selectedCardIndex;
              lastHighlightedInitialCardIndex = null;
              highlightMatchingSymbols(
                selectedCardIndex,
                StateModule.getGameState().deck,
                MainModalModule.getCategory()
              );
            }
          }
        });
      }

      const highlightMode1 = document.getElementById("highlightMode1");
      if (highlightMode1) {
        highlightMode1.addEventListener("change", () => {
          if (!highlightCheckbox?.checked) return;
          clearDeckHighlighting();
          if (lastHighlightedInitialCardIndex !== null) {
            HighlightMode1.highlight(
              lastHighlightedInitialCardIndex,
              StateModule.getGameState().deck,
              MainModalModule.getCategory()
            );
          } else if (lastHighlightedUsedCardIndex !== null) {
            HighlightMode1.highlight(
              lastHighlightedUsedCardIndex,
              StateModule.getGameState().deck,
              MainModalModule.getCategory()
            );
          }
        });
      }

      const highlightMode2 = document.getElementById("highlightMode2");
      if (highlightMode2) {
        highlightMode2.addEventListener("change", () => {
          if (!highlightCheckbox?.checked) return;
          clearDeckHighlighting();
          if (lastHighlightedInitialCardIndex !== null) {
            HighlightMode2.highlight(
              lastHighlightedInitialCardIndex,
              StateModule.getGameState().deck,
              MainModalModule.getCategory()
            );
          }
          if (lastHighlightedUsedCardIndex !== null) {
            HighlightMode2.highlight(
              lastHighlightedUsedCardIndex,
              StateModule.getGameState().deck,
              MainModalModule.getCategory()
            );
          }
        });
      }

      const showInitialDeckCheckbox = document.getElementById(
        "showInitialDeckCheckbox"
      );
      if (showInitialDeckCheckbox) {
        showInitialDeckCheckbox.addEventListener("change", function () {
          initialDeckDisplay.style.display = this.checked ? "flex" : "none";
        });
      }

      const showUsedDeckCheckbox = document.getElementById(
        "showUsedDeckCheckbox"
      );
      if (showUsedDeckCheckbox) {
        showUsedDeckCheckbox.addEventListener("change", function () {
          usedDeckDisplay.style.display = this.checked ? "flex" : "none";
        });
      }
    }

    // Відкладаємо ініціалізацію слухачів до завантаження DOM
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initializeEventListeners);
    } else {
      initializeEventListeners();
    }

    return {
      displayDeck,
      moveCardToUsedDeck,
      highlightMatchingSymbols,
      clearDeckHighlighting,
      updateInGameHighlighting,
    };
  })();

  // Модуль "Показати підказку" через IIFE
  const HintModule = (function () {
    let isHintVisible = false;
    let hintTimeout = null;
    let isAutoHintActive = false;

    function showHint() {
      const leftCard = document.querySelector('.card[data-position="left"]');
      const rightCard = document.querySelector('.card[data-position="right"]');
      if (!leftCard || !rightCard) return;

      const leftSymbols = Array.from(leftCard.querySelectorAll(".symbol"));
      const rightSymbols = Array.from(rightCard.querySelectorAll(".symbol"));
      const category = MainModalModule.getCategory();
      const theme = MainModalModule.getImageTheme();

      let commonSymbol = null;
      leftSymbols.forEach((leftSymbol) => {
        const leftValue = leftSymbol.dataset.symbol;
        rightSymbols.forEach((rightSymbol) => {
          const rightValue = rightSymbol.dataset.symbol;
          if (leftValue === rightValue) commonSymbol = leftValue;
        });
      });

      if (!commonSymbol) {
        console.error("Спільний символ не знайдено!");
        return;
      }

      StateModule.getDOMCache().hintDisplay.innerHTML = "";

      const hintSymbol = document.createElement("div");
      hintSymbol.classList.add("hint-symbol");
      if (category === "numbers" || category === "hieroglyphs") {
        hintSymbol.textContent = commonSymbol;
      } else if (category === "words") {
        hintSymbol.classList.add("word");
        hintSymbol.textContent = commonSymbol;
      } else if (category === "images") {
        hintSymbol.classList.add("image");
        const img = document.createElement("img");
        img.src = `resource/images/${theme}/${commonSymbol}`;
        img.onerror = () => {
          img.alt = "Зображення не знайдено";
          img.src = "resource/images/default.png";
          console.warn(`Не вдалося завантажити зображення: ${img.src}`);
        };
        hintSymbol.appendChild(img);
      }

      StateModule.getDOMCache().hintDisplay.appendChild(hintSymbol);
      StateModule.getDOMCache().hintDisplay.style.display = "block";
      isHintVisible = true;

      positionHint();
    }

    function hideHint() {
      StateModule.getDOMCache().hintDisplay.style.display = "none";
      isHintVisible = false;
      if (hintTimeout) {
        clearTimeout(hintTimeout);
        hintTimeout = null;
      }
    }

    function positionHint() {
      const button = document.getElementById("showHintButton");
      if (!button) return;

      const buttonRect = button.getBoundingClientRect();
      const gameContainerRect =
        StateModule.getDOMCache().gameContainer.getBoundingClientRect();

      const hintDisplay = StateModule.getDOMCache().hintDisplay;
      const hintHeight = hintDisplay.offsetHeight;
      const buttonHeight = buttonRect.height;

      let leftPosition = buttonRect.right - gameContainerRect.left + 10;
      let topPosition =
        buttonRect.top -
        gameContainerRect.top +
        (buttonHeight - hintHeight) / 2;

      // Адаптація для маленьких екранів
      if (window.innerWidth < 768) {
        leftPosition =
          buttonRect.left -
          gameContainerRect.left -
          hintDisplay.offsetWidth -
          10;
        if (leftPosition < 10) {
          leftPosition = buttonRect.right - gameContainerRect.left + 10;
        }
        topPosition = buttonRect.bottom - gameContainerRect.top + 5;
      }

      hintDisplay.style.left = `${leftPosition}px`;
      hintDisplay.style.top = `${topPosition}px`;
    }

    function resetHintState() {
      hideHint();
      isAutoHintActive = false;
    }

    function toggleHint() {
      if (document.getElementById("autoHintRadio").checked) {
        if (AutoHintLogic.getIsActive()) {
          AutoHintLogic.disable();
        } else {
          AutoHintLogic.enable();
        }
      } else if (document.getElementById("manualHintRadio").checked) {
        ManualHintLogic.showTemporary();
      }
    }

    const AutoHintLogic = (function () {
      function enable() {
        if (!isHintVisible) {
          showHint();
        }
        isAutoHintActive = true;
      }

      function disable() {
        if (isHintVisible) {
          hideHint();
        }
        isAutoHintActive = false;
      }

      return {
        enable,
        disable,
        getIsActive: () => isAutoHintActive,
      };
    })();

    const ManualHintLogic = (function () {
      function showTemporary() {
        if (!isHintVisible) {
          showHint();
          hintTimeout = setTimeout(() => {
            hideHint();
          }, 2000);
        }
      }

      return {
        showTemporary,
      };
    })();

    document
      .getElementById("manualHintRadio")
      .addEventListener("change", function () {
        if (this.checked) {
          AutoHintLogic.disable();
        }
      });

    document
      .getElementById("autoHintRadio")
      .addEventListener("change", function () {
        if (this.checked && !AutoHintLogic.getIsActive()) {
        }
      });

    return {
      showHint,
      hideHint,
      toggleHint,
      resetHintState,
      get isHintVisible() {
        return isHintVisible;
      },
      get isAutoHintActive() {
        return AutoHintLogic.getIsActive();
      },
      set isAutoHintActive(value) {
        if (value) {
          AutoHintLogic.enable();
        } else {
          AutoHintLogic.disable();
        }
      },
    };
  })();

  // Модуль "Підсвітити однакові елементи" через IIFE
  const HighlightModule = (function () {
    let isBlinkingActive = false;

    function clearAllHighlights() {
      const leftCard = document.querySelector('.card[data-position="left"]');
      const rightCard = document.querySelector('.card[data-position="right"]');
      if (!leftCard || !rightCard) {
        console.warn("Cards not found");
        return;
      }

      const leftSymbols = leftCard.querySelectorAll(".symbol");
      const rightSymbols = rightCard.querySelectorAll(".symbol");
      const category = MainModalModule.getCategory();
      leftSymbols.forEach((symbol) => {
        symbol.classList.remove("highlighted-main");
        if (category === "words") {
          symbol.style.color = "#000000";
          symbol.style.webkitTextStroke = "";
          symbol.style.textShadow = "";
        } else if (category === "images") {
          symbol.style.backgroundColor = "";
        }
      });
      rightSymbols.forEach((symbol) => {
        symbol.classList.remove("highlighted-main");
        if (category === "words") {
          symbol.style.color = "#000000";
          symbol.style.webkitTextStroke = "";
          symbol.style.textShadow = "";
        } else if (category === "images") {
          symbol.style.backgroundColor = "";
        }
      });
    }

    function clearHighlight(leftSymbols, rightSymbols, commonSymbol, category) {
      leftSymbols.forEach((symbol) => {
        if (symbol.dataset.symbol === commonSymbol) {
          symbol.classList.remove("highlighted-main");
          if (category === "words") {
            symbol.style.color = "#000000";
            symbol.style.webkitTextStroke = "";
            symbol.style.textShadow = "";
          } else if (category === "images") {
            symbol.style.backgroundColor = "";
          }
        }
      });
      rightSymbols.forEach((symbol) => {
        if (symbol.dataset.symbol === commonSymbol) {
          symbol.classList.remove("highlighted-main");
          if (category === "words") {
            symbol.style.color = "#000000";
            symbol.style.webkitTextStroke = "";
            symbol.style.textShadow = "";
          } else if (category === "images") {
            symbol.style.backgroundColor = "";
          }
        }
      });
    }

    const BlinkHighlightLogic = (function () {
      let localBlinkInterval = null;

      function start() {
        if (localBlinkInterval) {
          clearInterval(localBlinkInterval);
          localBlinkInterval = null;
        }

        const leftCard = document.querySelector('.card[data-position="left"]');
        const rightCard = document.querySelector(
          '.card[data-position="right"]'
        );
        if (!leftCard || !rightCard) {
          console.warn("Cards not found");
          return;
        }

        const leftSymbols = Array.from(leftCard.querySelectorAll(".symbol"));
        const rightSymbols = Array.from(rightCard.querySelectorAll(".symbol"));
        const category = MainModalModule.getCategory();

        let commonSymbol = null;
        leftSymbols.forEach((leftSymbol) => {
          const leftValue = leftSymbol.dataset.symbol;
          rightSymbols.forEach((rightSymbol) => {
            const rightValue = rightSymbol.dataset.symbol;
            if (leftValue === rightValue) commonSymbol = leftValue;
          });
        });

        if (!commonSymbol) {
          console.error("Спільний символ не знайдено!");
          return;
        }

        let isHighlighted = false;
        localBlinkInterval = setInterval(() => {
          leftSymbols.forEach((symbol) => {
            if (symbol.dataset.symbol === commonSymbol) {
              if (isHighlighted) {
                symbol.classList.remove("highlighted-main");
                if (category === "words") {
                  symbol.style.color = "#000000";
                  symbol.style.webkitTextStroke = "";
                  symbol.style.textShadow = "";
                } else if (category === "images") {
                  symbol.style.backgroundColor = "";
                }
              } else {
                symbol.classList.add("highlighted-main");
              }
            }
          });
          rightSymbols.forEach((symbol) => {
            if (symbol.dataset.symbol === commonSymbol) {
              if (isHighlighted) {
                symbol.classList.remove("highlighted-main");
                if (category === "words") {
                  symbol.style.color = "#000000";
                  symbol.style.webkitTextStroke = "";
                  symbol.style.textShadow = "";
                } else if (category === "images") {
                  symbol.style.backgroundColor = "";
                }
              } else {
                symbol.classList.add("highlighted-main");
              }
            }
          });
          isHighlighted = !isHighlighted;
        }, 500);
        isBlinkingActive = true;
      }

      function stop() {
        if (localBlinkInterval) {
          clearInterval(localBlinkInterval);
          localBlinkInterval = null;
        }
        clearAllHighlights();
        isBlinkingActive = false;
      }

      function toggle() {
        if (isBlinkingActive) {
          stop();
        } else {
          start();
        }
      }

      return {
        start,
        stop,
        toggle,
      };
    })();

    const SingleHighlightLogic = (function () {
      function highlight() {
        const leftCard = document.querySelector('.card[data-position="left"]');
        const rightCard = document.querySelector(
          '.card[data-position="right"]'
        );
        if (!leftCard || !rightCard) {
          console.warn("Cards not found");
          return;
        }

        const leftSymbols = Array.from(leftCard.querySelectorAll(".symbol"));
        const rightSymbols = Array.from(rightCard.querySelectorAll(".symbol"));
        const category = MainModalModule.getCategory();

        let commonSymbol = null;
        leftSymbols.forEach((leftSymbol) => {
          const leftValue = leftSymbol.dataset.symbol;
          rightSymbols.forEach((rightSymbol) => {
            const rightValue = rightSymbol.dataset.symbol;
            if (leftValue === rightValue) commonSymbol = leftValue;
          });
        });

        if (!commonSymbol) {
          console.error("Спільний символ не знайдено!");
          return;
        }

        leftSymbols.forEach((symbol) => {
          if (symbol.dataset.symbol === commonSymbol)
            symbol.classList.add("highlighted-main");
        });
        rightSymbols.forEach((symbol) => {
          if (symbol.dataset.symbol === commonSymbol)
            symbol.classList.add("highlighted-main");
        });

        setTimeout(() => {
          clearHighlight(leftSymbols, rightSymbols, commonSymbol, category);
        }, 500);
      }

      return {
        highlight,
      };
    })();

    function highlightMatchingMainCardSymbols() {
      BlinkHighlightLogic.stop();
      SingleHighlightLogic.highlight();
    }

    function startBlinkingHighlight() {
      BlinkHighlightLogic.start();
    }

    function stopBlinkingHighlight() {
      BlinkHighlightLogic.stop();
    }

    function toggleBlinkingHighlight() {
      BlinkHighlightLogic.toggle();
    }

    return {
      highlightMatchingMainCardSymbols,
      startBlinkingHighlight,
      stopBlinkingHighlight,
      toggleBlinkingHighlight,
      get isBlinkingActive() {
        return isBlinkingActive;
      },
      set isBlinkingActive(value) {
        isBlinkingActive = value;
        if (!value) {
          BlinkHighlightLogic.stop();
        }
      },
    };
  })();

  return {
    DeckModule,
    HintModule,
    HighlightModule,
  };
})();

// Модуль "Показати логи" через IIFE
const LogsModule = (function () {
  function updateLogsDisplay(logs, category, theme) {
    if (!document.getElementById("showLogsCheckbox").checked) return;
    StateModule.getDOMCache().logsList.innerHTML = "";
    logs.forEach((log, index) => {
      const logItem = document.createElement("p");
      if (log.isCorrect) {
        if (log.isImage) {
          const img = document.createElement("img");
          img.src = log.imagePath;
          img.classList.add("log-image");
          img.onerror = () => {
            img.alt = "Зображення не знайдено";
            img.src = "resource/images/default.png";
            console.warn(`Не вдалося завантажити зображення: ${img.src}`);
          };
          logItem.textContent = `${index + 1}. Загальний час: ${
            log.totalTime
          }, Час пари: ${log.pairTime}, Спільний елемент: `;
          logItem.appendChild(img);
        } else {
          logItem.textContent = `${index + 1}. Загальний час: ${
            log.totalTime
          }, Час пари: ${log.pairTime}, Спільний елемент: ${log.symbol}`;
        }
      } else {
        logItem.innerHTML = `${index + 1}. Загальний час: ${
          log.totalTime
        }, Час порівняння: ${
          log.pairTime
        } - <span style="color: red;">Некоректний вибір</span>`;
      }
      StateModule.getDOMCache().logsList.appendChild(logItem);
    });
    if (document.getElementById("scrollToBottomCheckbox").checked) {
      StateModule.getDOMCache().logsList.scrollTop =
        StateModule.getDOMCache().logsList.scrollHeight;
    }
  }

  function logMatch(symbol, pairTime, isCorrect, category, theme) {
    const logEntry = {
      totalTime: TimerWindowModule.formatTime(
        StateModule.getGameState().totalTimeMs
      ),
      pairTime: TimerWindowModule.formatTime(pairTime),
      symbol: isCorrect ? symbol : null,
      isCorrect,
      isImage: category === "images" && isCorrect,
      imagePath:
        category === "images" && isCorrect
          ? `resource/images/${theme}/${symbol}`
          : null,
    };
    StateModule.getGameState().gameLogs.push(logEntry);
    updateLogsDisplay(StateModule.getGameState().gameLogs, category, theme);
  }

  document
    .getElementById("toggleLogsRadio")
    .addEventListener("change", function () {
      if (document.getElementById("toggleLogsRadio").checked) {
        StateModule.getDOMCache().logsList.parentElement.style.display =
          "block";
        document.getElementById("scrollToBottomLabel").style.display =
          "inline-flex";
        document.getElementById("showLogsCheckbox").checked = true;
        LogsModule.updateLogsDisplay(
          StateModule.getGameState().gameLogs,
          MainModalModule.getCategory(),
          MainModalModule.getImageTheme()
        );
      } else {
        StateModule.getDOMCache().logsList.parentElement.style.display = "none";
        document.getElementById("scrollToBottomLabel").style.display = "none";
        document.getElementById("showLogsCheckbox").checked = false;
      }
    });

  document
    .getElementById("showLogsCheckbox")
    .addEventListener("change", function () {
      if (document.getElementById("showLogsCheckbox").checked) {
        StateModule.getDOMCache().logsList.parentElement.style.display =
          "block";
        document.getElementById("logsToggleContainer").style.display = "flex";
        document.getElementById("toggleLogsRadio").checked = true;
        document.getElementById("scrollToBottomLabel").style.display =
          "inline-flex";
        LogsModule.updateLogsDisplay(
          StateModule.getGameState().gameLogs,
          MainModalModule.getCategory(),
          MainModalModule.getImageTheme()
        );
      } else {
        StateModule.getDOMCache().logsList.parentElement.style.display = "none";
        document.getElementById("logsToggleContainer").style.display = "none";
        document.getElementById("toggleLogsRadio").checked = false;
        document.getElementById("scrollToBottomLabel").style.display = "none";
      }
    });

  return {
    updateLogsDisplay,
    logMatch,
  };
})();

// Модуль "Таймер" через IIFE
const TimerWindowModule = (function () {
  // IIFE для логіки загального часу гри
  const TotalTimeLogic = (function () {
    let totalTimerInterval = null;

    function start() {
      if (totalTimerInterval) {
        clearInterval(totalTimerInterval);
      }
      totalTimerInterval = setInterval(() => {
        StateModule.getGameState().totalTimeMs += 100;
        StateModule.getDOMCache().totalTimeTimer.textContent = formatTime(
          StateModule.getGameState().totalTimeMs
        );
      }, 100);
    }

    function stop() {
      if (totalTimerInterval) {
        clearInterval(totalTimerInterval);
        totalTimerInterval = null;
      }
    }

    return {
      start,
      stop,
    };
  })();

  // IIFE для логіки часу знаходження пари
  const PairTimeLogic = (function () {
    let pairTimerInterval = null;

    function start() {
      if (pairTimerInterval) {
        clearInterval(pairTimerInterval);
      }
      pairTimerInterval = setInterval(() => {
        StateModule.getGameState().pairTimeMs += 100;
        StateModule.getDOMCache().pairTimeTimer.textContent = formatTime(
          StateModule.getGameState().pairTimeMs
        );
      }, 100);
    }

    function stop() {
      if (pairTimerInterval) {
        clearInterval(pairTimerInterval);
        pairTimerInterval = null;
      }
    }

    function reset() {
      stop();
      StateModule.getGameState().pairTimeMs = 0;
      StateModule.getDOMCache().pairTimeTimer.textContent = formatTime(0);
      start();
    }

    return {
      start,
      stop,
      reset,
    };
  })();

  function startTimers() {
    TotalTimeLogic.start();
    PairTimeLogic.start();
  }

  function stopTimers() {
    TotalTimeLogic.stop();
    PairTimeLogic.stop();
  }

  function resetPairTimer() {
    PairTimeLogic.reset();
  }

  function stopPairTimer() {
    PairTimeLogic.stop();
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 100);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${milliseconds}`;
  }

  function showEndGameButton() {
    document.getElementById("endGameButton").style.display = "inline-block";
  }

  function hideEndGameButton() {
    document.getElementById("endGameButton").style.display = "none";
  }

  function showCompleteGameModal() {
    stopTimers();
    const modal = document.getElementById("completeGameModal");
    const newGameButton = document.getElementById("newGameButtonComplete");
    const exitButton = document.getElementById("exitButtonComplete");

    if (!modal || !newGameButton || !exitButton) {
      console.error(
        "Не вдалося знайти елементи модального вікна завершення гри!"
      );
      return;
    }

    let totalTimeSpan = document.getElementById("finalTotalTime");
    let matchedPairsSpan = document.getElementById("matchedPairs");

    if (!totalTimeSpan) {
      totalTimeSpan = document.createElement("span");
      totalTimeSpan.id = "finalTotalTime";
      const totalTimeParagraph = document.createElement("p");
      totalTimeParagraph.textContent = "Загальний час: ";
      totalTimeParagraph.appendChild(totalTimeSpan);
      modal
        .querySelector(".modal-content")
        .insertBefore(totalTimeParagraph, newGameButton);
    }

    if (!matchedPairsSpan) {
      matchedPairsSpan = document.createElement("span");
      matchedPairsSpan.id = "matchedPairs";
      const matchedPairsParagraph = document.createElement("p");
      matchedPairsParagraph.textContent = "Знайдено пар: ";
      matchedPairsParagraph.appendChild(matchedPairsSpan);
      modal
        .querySelector(".modal-content")
        .insertBefore(matchedPairsParagraph, newGameButton);
    }

    totalTimeSpan.textContent = formatTime(
      StateModule.getGameState().totalTimeMs
    );
    matchedPairsSpan.textContent =
      StateModule.getGameState().matchedSymbols.length;

    modal.style.display = "flex";
    StateModule.getDOMCache().gameContainer.style.display = "none";

    newGameButton.onclick = function () {
      modal.style.display = "none";
      MainModalModule.showModal();
    };

    exitButton.onclick = function () {
      window.close();
    };
  }

  function showEndGameModal() {
    stopTimers();
    const modal = document.getElementById("endGameModal");
    const newGameButton = document.getElementById("newGameButton");
    const exitButton = document.getElementById("exitButton");

    if (!modal || !newGameButton || !exitButton) {
      console.error(
        "Не вдалося знайти елементи модального вікна дострокового завершення гри!"
      );
      return;
    }

    modal.style.display = "flex";
    StateModule.getDOMCache().gameContainer.style.display = "none";

    newGameButton.onclick = function () {
      modal.style.display = "none";
      MainModalModule.showModal();
    };

    exitButton.onclick = function () {
      window.close();
    };
  }

  return {
    startTimers,
    stopTimers,
    resetPairTimer,
    stopPairTimer,
    formatTime,
    showEndGameButton,
    hideEndGameButton,
    showCompleteGameModal,
    showEndGameModal,
  };
})();

// Ініціалізація гри
document.addEventListener("DOMContentLoaded", function () {
  // IIFE для ініціалізації модального вікна та повзунка
  (function InitializeModalAndSlider() {
    MainModalModule.showModal();

    // Ініціалізуємо повзунок із початковою кількістю символів
    var initialCategory = document.getElementById("elementCategory").value;
    var initialNumSymbols = 4; // За замовчуванням для "numbers"
    if (initialCategory === "images") {
      initialNumSymbols = parseInt(document.getElementById("numSymbolsImages").value);
    } else if (initialCategory === "hieroglyphs") {
      initialNumSymbols = parseInt(document.getElementById("numSymbolsHieroglyphs").value);
    } else if (initialCategory === "words") {
      initialNumSymbols = parseInt(document.getElementById("numSymbolsWords").value);
    } else {
      initialNumSymbols = parseInt(document.getElementById("numSymbolsNumbers").value);
    }
    CardsSliderModule.updateSlider(initialNumSymbols);
  })();

  // IIFE для обробника кнопки "Завершити гру"
  (function EndGameButtonHandler() {
    document.getElementById("endGameButton").addEventListener("click", function () {
      TimerWindowModule.showEndGameModal();
    });
  })();

  // IIFE для обробника кнопки "Підсвітити однакові елементи"
  (function HighlightButtonHandler() {
    document.getElementById("highlightMainCardsButton").addEventListener("click", function () {
      if (document.getElementById("blinkHighlightRadio").checked) {
        HintsCoreModule.HighlightModule.toggleBlinkingHighlight();
      } else {
        HintsCoreModule.HighlightModule.stopBlinkingHighlight();
        HintsCoreModule.HighlightModule.highlightMatchingMainCardSymbols();
      }
    });
  })();

  // IIFE для обробника кнопки "Показати підказку"
  (function HintButtonHandler() {
    document.getElementById("showHintButton").addEventListener("click", function () {
      HintsCoreModule.HintModule.toggleHint();
    });
  })();

  // IIFE для обробника радіокнопки "Постійна підказка"
  (function AutoHintRadioHandler() {
    document.getElementById("autoHintRadio").addEventListener("change", function () {
      if (this.checked) {
        HintsCoreModule.HintModule.isAutoHintActive = true;
        HintsCoreModule.HintModule.showHint();
      } else {
        HintsCoreModule.HintModule.hideHint();
        HintsCoreModule.HintModule.isAutoHintActive = false;
      }
    });
  })();

  // IIFE для обробника радіокнопки "Миготіння"
  (function BlinkHighlightRadioHandler() {
    document.getElementById("blinkHighlightRadio").addEventListener("change", function () {
      if (this.checked && MainModalModule.getShowHighlightButton()) {
        HintsCoreModule.HighlightModule.startBlinkingHighlight();
      } else {
        HintsCoreModule.HighlightModule.stopBlinkingHighlight();
      }
    });
  })();

  // IIFE для обробника радіокнопки "Одноразове підсвічування"
  (function SingleHighlightRadioHandler() {
    document.getElementById("singleHighlightRadio").addEventListener("change", function () {
      if (this.checked) {
        HintsCoreModule.HighlightModule.stopBlinkingHighlight();
      }
    });
  })();
});
