// Модуль стану гри через IIFE
const StateModule = (function () {
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
    gameContainer: document.getElementById("gameContainer"),
  };

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
    isGeneralTimerPaused: false,
    isPartialTimerPaused: false,
    gameSettings: {
      category: "numbers",
      difficulty: "light",
      modification: "none",
      numberOfSymbols: 4,
      numberOfCards: 13,
      pulsationSpeed: "medium",
      flickerSpeed: "medium",
      imageTheme: "classic",
      showHighlightButton: false,
      showHintButton: false,
      showStopPulsationButton: false,
      showStopBlinkButton: false,
      showStopGeneralTimer: false,
      showStopPartialTimer: false,
      showDeck: false,
      showLogs: false,
    },
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
      this.isGeneralTimerPaused = false;
      this.isPartialTimerPaused = false;
      // Видалено виклики HintsCoreModule і TimerWindowModule
    },
  };

  return {
    getDOMCache: () => DOMCache,
    getGameState: () => gameState,
    resetGameState: () => gameState.reset(),
  };
})();

// Модуль "Головна логіка гри" через IIFE
const GameCoreModule = (function () {
  let isFirstPair = true;

  function startGame() {
    const category = MainModalModule.getCategory();
    let difficulty = MainModalModule.getDifficulty();
    const numberOfSymbols = MainModalModule.getNumberOfSymbols();
    const theme = MainModalModule.getImageTheme();
    const cardsCount = CardsSliderModule.getSelectedCardsCount();

    if (difficulty === "mediumModifiedLevel") {
      console.warn(
        `Некоректне значення difficulty: "${difficulty}". Виправлено на "medium_modified".`
      );
      difficulty = "medium_modified";
    }

    console.log("Starting new game with:", {
      category,
      difficulty,
      numberOfSymbols,
      theme,
      cardsCount,
    });

    if (!["numbers", "images", "hieroglyphs", "words"].includes(category)) {
      alert(`Невідома категорія: ${category}. Виберіть правильну категорію.`);
      return;
    }
    if (
      !["light", "medium", "medium_modified"].includes(difficulty) &&
      category === "numbers"
    ) {
      alert(
        `Невідомий рівень складності для чисел: ${difficulty}. Виберіть "Легкий", "Середній" або "Середній модифікований".`
      );
      return;
    }
    if (numberOfSymbols < 2) {
      alert(
        `Кількість символів (${numberOfSymbols}) замала. Виберіть принаймні 2 символи на карту.`
      );
      return;
    }
    if (
      (category === "hieroglyphs" || category === "words") &&
      numberOfSymbols > 5
    ) {
      alert(
        `Кількість символів (${numberOfSymbols}) завелика для категорії "${category}". Максимум 5 символів.`
      );
      return;
    }

    StateModule.resetGameState();
    StateModule.getDOMCache().totalTimeTimer.textContent =
      TimerWindowModule.formatTime(0);
    StateModule.getDOMCache().pairTimeTimer.textContent =
      TimerWindowModule.formatTime(0);
    HintsCoreModule.HighlightModule.stopBlinkingHighlight();
    HintsCoreModule.HighlightModule.isBlinkingActive = false;
    HintsCoreModule.HintModule.hideHint();
    document
      .querySelectorAll(
        ".number-text.pulsating, .number-text.flickering-slow, .number-text.flickering-medium, .number-text.flickering-fast, .number-text.flickering-asynchronous, .number-text.trembling"
      )
      .forEach((symbol) => {
        symbol.classList.remove(
          "pulsating",
          "flickering-slow",
          "flickering-medium",
          "flickering-fast",
          "flickering-asynchronous",
          "trembling"
        );
        symbol.style.animationDelay = "";
      });
    StateModule.getDOMCache().usedDeckDisplay.innerHTML = "";
    isFirstPair = true;

    HintsCoreModule.HintModule.resetHintState();
    HintsCoreModule.StopPulsationModule.resetState();
    HintsCoreModule.StopBlinkModule.resetState();
    HintsCoreModule.StopTremblingModule.resetState();

    const fullDeck = DifficultyModule.generateDeck(
      category,
      difficulty,
      numberOfSymbols,
      theme
    );

    if (fullDeck.length === 0) {
      let errorMessage = `Неможливо згенерувати колоду з параметрами: категорія=${category}, складність=${difficulty}, кількість символів=${numberOfSymbols}.`;
      if (category === "hieroglyphs" || category === "words") {
        errorMessage +=
          " Максимальна кількість символів для ієрогліфів або слів — 5.";
      } else {
        errorMessage +=
          " Перевірте, чи кількість символів не замала (мінімум 2) і чи вибрано правильний рівень складності.";
      }
      alert(errorMessage);
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

    console.log(
      `Вибрано ${StateModule.getGameState().deck.length} карток для гри`
    );

    if (MainModalModule.getShowLogs()) {
      LogsModule.updateLogsDisplay(
        StateModule.getGameState().gameLogs,
        category,
        theme
      );
    }

    TimerWindowModule.showEndGameButton();
    TimerWindowModule.startTimers();

    const logsToggleContainer = document.getElementById("logsToggleContainer");
    const toggleLogsRadio = document.getElementById("toggleLogsRadio");
    const scrollToBottomLabel = document.getElementById("scrollToBottomLabel");
    toggleLogsRadio.checked = MainModalModule.getShowLogs();
    StateModule.getDOMCache().logsList.parentElement.style.display =
      MainModalModule.getShowLogs() ? "block" : "none";
    logsToggleContainer.style.display = MainModalModule.getShowLogs()
      ? "flex"
      : "none";
    scrollToBottomLabel.style.display =
      MainModalModule.getShowLogs() && toggleLogsRadio.checked
        ? "inline-flex"
        : "none";

    document.getElementById("highlightMainCardsButton").style.display =
      MainModalModule.getShowHighlightButton() ? "inline-block" : "none";
    document.getElementById("showHintButton").style.display =
      MainModalModule.getShowHintButton() ? "inline-block" : "none";
    const hintRadios = document.querySelector(".hint-radios");
    hintRadios.style.display = MainModalModule.getShowHintButton()
      ? "flex"
      : "none";
    const highlightRadios = document.querySelector(".highlight-radios");
    highlightRadios.style.display = MainModalModule.getShowHighlightButton()
      ? "flex"
      : "none";
    const pulsationRadios = document.querySelector(".pulsation-radios");
    const blinkRadios = document.querySelector(".blink-radios");
    const tremblingRadios = document.querySelector(".trembling-radios");
    pulsationRadios.style.display =
      MainModalModule.getShowStopPulsationButton() &&
      category === "numbers" &&
      difficulty === "medium_modified" &&
      MainModalModule.getModification() === "pulsation"
        ? "flex"
        : "none";
    blinkRadios.style.display =
      MainModalModule.getShowStopBlinkButton() &&
      category === "numbers" &&
      difficulty === "medium_modified" &&
      MainModalModule.getModification() === "flickering"
        ? "flex"
        : "none";
    tremblingRadios.style.display =
      MainModalModule.getShowStopTremblingButton() &&
      category === "numbers" &&
      difficulty === "medium_modified" &&
      MainModalModule.getModification() === "trembling"
        ? "flex"
        : "none";

    const permanentStopPulsationRadio = document.getElementById(
      "permanentStopPulsationRadio"
    );
    const temporaryStopPulsationRadio = document.getElementById(
      "temporaryStopPulsationRadio"
    );
    const permanentStopBlinkRadio = document.getElementById(
      "permanentStopBlinkRadio"
    );
    const temporaryStopBlinkRadio = document.getElementById(
      "temporaryStopBlinkRadio"
    );
    const permanentStopTremblingRadio = document.getElementById(
      "permanentStopTremblingRadio"
    );
    const temporaryStopTremblingRadio = document.getElementById(
      "temporaryStopTremblingRadio"
    );

    if (permanentStopPulsationRadio && temporaryStopPulsationRadio) {
      temporaryStopPulsationRadio.checked = true;
      permanentStopPulsationRadio.checked = false;
      HintsCoreModule.StopPulsationModule.resetTimerLabel();
    }
    if (permanentStopBlinkRadio && temporaryStopBlinkRadio) {
      temporaryStopBlinkRadio.checked = true;
      permanentStopBlinkRadio.checked = false;
      HintsCoreModule.StopBlinkModule.resetTimerLabel();
    }
    if (permanentStopTremblingRadio && temporaryStopTremblingRadio) {
      temporaryStopTremblingRadio.checked = true;
      permanentStopTremblingRadio.checked = false;
      HintsCoreModule.StopTremblingModule.resetTimerLabel();
    }

    const dependOnCardElementsCheckbox = document.querySelector(
      "#hintControls .pulsation-radios #dependOnCardElementsCheckbox"
    );
    const dependOnCardElementsBlinkCheckbox = document.querySelector(
      "#hintControls .blink-radios #dependOnCardElementsBlinkCheckbox"
    );
    const dependOnCardElementsTremblingCheckbox = document.querySelector(
      "#hintControls .trembling-radios #dependOnCardElementsTremblingCheckbox"
    );

    if (
      dependOnCardElementsCheckbox &&
      dependOnCardElementsCheckbox.parentElement
    ) {
      dependOnCardElementsCheckbox.parentElement.style.display = "none";
    }

    if (
      dependOnCardElementsBlinkCheckbox &&
      dependOnCardElementsBlinkCheckbox.parentElement
    ) {
      dependOnCardElementsBlinkCheckbox.parentElement.style.display = "none";
    }

    if (
      dependOnCardElementsTremblingCheckbox &&
      dependOnCardElementsTremblingCheckbox.parentElement
    ) {
      dependOnCardElementsTremblingCheckbox.parentElement.style.display =
        MainModalModule.getShowStopTremblingButton() &&
        MainModalModule.getDependOnCardElementsTrembling()
          ? "block"
          : "none";
      dependOnCardElementsTremblingCheckbox.disabled = false;
    }

    document.getElementById("hintControls").style.display =
      MainModalModule.getShowHighlightButton() ||
      MainModalModule.getShowHintButton() ||
      MainModalModule.getShowStopPulsationButton() ||
      MainModalModule.getShowStopBlinkButton() ||
      MainModalModule.getShowStopTremblingButton() ||
      MainModalModule.getShowStopGeneralTimer() ||
      MainModalModule.getShowStopPartialTimer()
        ? "flex"
        : "none";

    const initialDeckExplanation = document.querySelector(
      "#gameContainer > div.deck-explanation"
    );
    initialDeckExplanation.style.display = MainModalModule.getShowDeck()
      ? "block"
      : "none";
    document.getElementById("deckExplanation").style.display =
      MainModalModule.getShowDeck() ? "block" : "none";
    StateModule.getDOMCache().initialDeckDisplay.style.display =
      MainModalModule.getShowDeck() &&
      document.getElementById("showInitialDeckCheckbox").checked
        ? "flex"
        : "none";
    StateModule.getDOMCache().usedDeckDisplay.style.display =
      MainModalModule.getShowDeck() &&
      document.getElementById("showUsedDeckCheckbox").checked
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
        tempAvailableCards[
          Math.floor(Math.random() * tempAvailableCards.length)
        ];
    } else {
      StateModule.getGameState().leftCardIndex =
        StateModule.getGameState().rightCardIndex;
      const tempAvailableCards = availableCards.filter(
        (index) => index !== StateModule.getGameState().leftCardIndex
      );
      StateModule.getGameState().rightCardIndex =
        tempAvailableCards[
          Math.floor(Math.random() * tempAvailableCards.length)
        ];
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
      StateModule.getGameState().deck[
        StateModule.getGameState().rightCardIndex
      ];

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
      else if (category === "hieroglyphs")
        symbolDiv.classList.add("hieroglyph");
      else if (category === "words") symbolDiv.classList.add("word");
      else if (category === "images") symbolDiv.classList.add("image");

      if (
        category === "numbers" ||
        category === "hieroglyphs" ||
        category === "words"
      ) {
        const textSpan = document.createElement("span");
        textSpan.classList.add(
          category === "numbers"
            ? "number-text"
            : category === "hieroglyphs"
            ? "hieroglyph-text"
            : "word-text"
        );
        textSpan.textContent = symbol;
        symbolDiv.appendChild(textSpan);
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
      else if (category === "hieroglyphs")
        symbolDiv.classList.add("hieroglyph");
      else if (category === "words") symbolDiv.classList.add("word");
      else if (category === "images") symbolDiv.classList.add("image");

      if (
        category === "numbers" ||
        category === "hieroglyphs" ||
        category === "words"
      ) {
        const textSpan = document.createElement("span");
        textSpan.classList.add(
          category === "numbers"
            ? "number-text"
            : category === "hieroglyphs"
            ? "hieroglyph-text"
            : "word-text"
        );
        textSpan.textContent = symbol;
        symbolDiv.appendChild(textSpan);
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

    if (
      category === "numbers" &&
      MainModalModule.getDifficulty() === "medium_modified"
    ) {
      console.log("Applying modification for medium_modified");
      if (
        MainModalModule.getModification() === "pulsation" &&
        !HintsCoreModule.StopPulsationModule.isPulsationStopped
      ) {
        DifficultyModule.NumbersLogic.MediumModifiedLevelNumbersLogic.apply(
          leftCard,
          rightCard
        );
      } else if (
        MainModalModule.getModification() === "flickering" &&
        !HintsCoreModule.StopBlinkModule.isBlinkStopped
      ) {
        DifficultyModule.NumbersLogic.MediumModifiedLevelNumbersLogic.apply(
          leftCard,
          rightCard
        );
      } else if (
        MainModalModule.getModification() === "trembling" &&
        !HintsCoreModule.StopTremblingModule.isTremblingStopped
      ) {
        DifficultyModule.NumbersLogic.TremblingMediumModifiedLevelNumbersLogic.apply(
          leftCard,
          rightCard
        );
      }
      TimerWindowModule.resetPairTimer();

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
        StateModule.getGameState().selectedLeftSymbol.classList.remove(
          "selected"
        );
      }
      StateModule.getGameState().selectedLeftSymbol = symbol;
      symbol.classList.add("selected");
    } else if (position === "right") {
      if (StateModule.getGameState().selectedRightSymbol) {
        StateModule.getGameState().selectedRightSymbol.classList.remove(
          "selected"
        );
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
        HintsCoreModule.StopPartialTimerModule.syncAfterCardChange();
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
  const showStopPulsationButtonCheckbox = document.getElementById(
    "showStopPulsationButtonCheckbox"
  );
  const showStopBlinkButtonCheckbox = document.getElementById(
    "showStopBlinkButtonCheckbox"
  );
  const showStopTremblingButtonCheckbox = document.getElementById(
    "showStopTremblingButtonCheckbox"
  );
  const showStopGeneralTimerCheckbox = document.getElementById(
    "showStopGeneralTimerCheckbox"
  );
  const showStopPartialTimerCheckbox = document.getElementById(
    "showStopPartialTimerCheckbox"
  );
  const dependOnCardElementsCheckbox = document.getElementById(
    "dependOnCardElementsCheckbox"
  );
  const dependOnCardElementsBlinkCheckbox = document.getElementById(
    "dependOnCardElementsBlinkCheckbox"
  );
  const dependOnCardElementsTremblingCheckbox = document.getElementById(
    "dependOnCardElementsTremblingCheckbox"
  );
  const pulsationSpeedSelect = document.getElementById("pulsationSpeed");
  const flickerSpeedSelect = document.getElementById("flickerSpeed");
  const trembleSpeedSelect = document.getElementById("trembleSpeed");
  const modificationContainer = document.getElementById(
    "modificationContainer"
  );
  const modificationSelect = document.getElementById("modificationSelect");
  const difficultySelect = document.getElementById("difficultyLevel");

  function showModal() {
    if (!difficultySelect) {
      console.error("Елемент #difficultyLevel не знайдено в DOM");
      return;
    }
    modal.style.display = "flex";
    TimerWindowModule.hideEndGameButton();
    StateModule.getDOMCache().gameContainer.style.display = "none";
    const category = elementCategorySelect.value;
    DifficultyModule.updateDifficultyOptions(category);
    if (
      category === "numbers" &&
      DifficultyModule.getDifficulty() === "medium_modified"
    ) {
      modificationSelect.value = "pulsation";
    }
    updateMainOptions();
  }

  function closeModal() {
    modal.style.display = "none";
    StateModule.getDOMCache().gameContainer.style.display = "block";
    HintsCoreModule.StopPulsationModule.resetTimerLabel();
    HintsCoreModule.StopBlinkModule.resetTimerLabel();
    HintsCoreModule.StopTremblingModule.resetTimerLabel();
  }

  function closeApp() {
    window.close();
  }

  function isPulsationAvailable() {
    const category = elementCategorySelect.value;
    const difficulty = DifficultyModule.getDifficulty();
    const modification = modificationSelect.value;
    return (
      category === "numbers" &&
      difficulty === "medium_modified" &&
      modification === "pulsation"
    );
  }

  function isFlickeringAvailable() {
    const category = elementCategorySelect.value;
    const difficulty = DifficultyModule.getDifficulty();
    const modification = modificationSelect.value;
    return (
      category === "numbers" &&
      difficulty === "medium_modified" &&
      modification === "flickering"
    );
  }

  function isTremblingAvailable() {
    const category = elementCategorySelect.value;
    const difficulty = DifficultyModule.getDifficulty();
    const modification = modificationSelect.value;
    return (
      category === "numbers" &&
      difficulty === "medium_modified" &&
      modification === "trembling"
    );
  }

  function updateMainSettingsCheckboxes() {
    if (isPulsationAvailable()) {
      showStopPulsationButtonCheckbox.disabled = false;
      showStopPulsationButtonCheckbox.parentElement.style.opacity = "1";
      showStopPulsationButtonCheckbox.parentElement.style.cursor = "auto";
      dependOnCardElementsCheckbox.parentElement.style.display =
        showStopPulsationButtonCheckbox.checked ? "block" : "none";
      dependOnCardElementsCheckbox.disabled =
        !showStopPulsationButtonCheckbox.checked;
      dependOnCardElementsCheckbox.parentElement.style.opacity =
        showStopPulsationButtonCheckbox.checked ? "1" : "0.5";
      dependOnCardElementsCheckbox.parentElement.style.cursor =
        showStopPulsationButtonCheckbox.checked ? "auto" : "not-allowed";
    } else {
      showStopPulsationButtonCheckbox.disabled = true;
      showStopPulsationButtonCheckbox.checked = false;
      showStopPulsationButtonCheckbox.parentElement.style.opacity = "0.5";
      showStopPulsationButtonCheckbox.parentElement.style.cursor =
        "not-allowed";
      dependOnCardElementsCheckbox.parentElement.style.display = "none";
      dependOnCardElementsCheckbox.disabled = true;
      dependOnCardElementsCheckbox.checked = false;
    }

    if (isFlickeringAvailable()) {
      showStopBlinkButtonCheckbox.disabled = false;
      showStopBlinkButtonCheckbox.parentElement.style.opacity = "1";
      showStopBlinkButtonCheckbox.parentElement.style.cursor = "auto";
      dependOnCardElementsBlinkCheckbox.parentElement.style.display =
        showStopBlinkButtonCheckbox.checked ? "block" : "none";
      dependOnCardElementsBlinkCheckbox.disabled =
        !showStopBlinkButtonCheckbox.checked;
      dependOnCardElementsBlinkCheckbox.parentElement.style.opacity =
        showStopBlinkButtonCheckbox.checked ? "1" : "0.5";
      dependOnCardElementsBlinkCheckbox.parentElement.style.cursor =
        showStopBlinkButtonCheckbox.checked ? "auto" : "not-allowed";
    } else {
      showStopBlinkButtonCheckbox.disabled = true;
      showStopBlinkButtonCheckbox.checked = false;
      showStopBlinkButtonCheckbox.parentElement.style.opacity = "0.5";
      showStopBlinkButtonCheckbox.parentElement.style.cursor = "not-allowed";
      dependOnCardElementsBlinkCheckbox.parentElement.style.display = "none";
      dependOnCardElementsBlinkCheckbox.disabled = true;
      dependOnCardElementsBlinkCheckbox.checked = false;
    }

    if (isTremblingAvailable()) {
      showStopTremblingButtonCheckbox.disabled = false;
      showStopTremblingButtonCheckbox.parentElement.style.opacity = "1";
      showStopTremblingButtonCheckbox.parentElement.style.cursor = "auto";
      dependOnCardElementsTremblingCheckbox.parentElement.style.display =
        showStopTremblingButtonCheckbox.checked ? "block" : "none";
      dependOnCardElementsTremblingCheckbox.disabled =
        !showStopTremblingButtonCheckbox.checked;
      dependOnCardElementsTremblingCheckbox.parentElement.style.opacity =
        showStopTremblingButtonCheckbox.checked ? "1" : "0.5";
      dependOnCardElementsTremblingCheckbox.parentElement.style.cursor =
        showStopTremblingButtonCheckbox.checked ? "auto" : "not-allowed";
    } else {
      showStopTremblingButtonCheckbox.disabled = true;
      showStopTremblingButtonCheckbox.checked = false;
      showStopTremblingButtonCheckbox.parentElement.style.opacity = "0.5";
      showStopTremblingButtonCheckbox.parentElement.style.cursor =
        "not-allowed";
      dependOnCardElementsTremblingCheckbox.parentElement.style.display =
        "none";
      dependOnCardElementsTremblingCheckbox.disabled = true;
      dependOnCardElementsTremblingCheckbox.checked = false;
    }

    if (showStopGeneralTimerCheckbox) {
      showStopGeneralTimerCheckbox.disabled = false;
      showStopGeneralTimerCheckbox.parentElement.style.opacity = "1";
      showStopGeneralTimerCheckbox.parentElement.style.cursor = "auto";
    }
    if (showStopPartialTimerCheckbox) {
      showStopPartialTimerCheckbox.disabled = false;
      showStopPartialTimerCheckbox.parentElement.style.opacity = "1";
      showStopPartialTimerCheckbox.parentElement.style.cursor = "auto";
    }

    console.log(
      `showStopBlinkButtonCheckbox: disabled=${showStopBlinkButtonCheckbox.disabled}, ` +
        `isFlickering=${isFlickeringAvailable()}, isTrembling=${isTremblingAvailable()}`
    );
  }

  function updateMainOptions() {
    const category = elementCategorySelect.value;
    console.log(`Оновлення опцій для категорії: ${category}`);

    numSymbolsNumbersContainer.style.display = "none";
    numSymbolsImagesContainer.style.display = "none";
    numSymbolsHieroglyphsContainer.style.display = "none";
    numSymbolsWordsContainer.style.display = "none";
    imageThemeContainer.style.display = "none";
    modificationContainer.style.display = "none";
    pulsationSpeedSelect.parentElement.style.display = "none";
    flickerSpeedSelect.parentElement.style.display = "none";
    trembleSpeedSelect.parentElement.style.display = "none";

    let numberOfSymbols = 4;
    if (category === "numbers") {
      numSymbolsNumbersContainer.style.display = "block";
      numberOfSymbols = parseInt(numSymbolsNumbersSelect.value);
      modificationContainer.style.display =
        DifficultyModule.getDifficulty() === "medium_modified"
          ? "block"
          : "none";
      if (DifficultyModule.getDifficulty() === "medium_modified") {
        pulsationSpeedSelect.parentElement.style.display =
          isPulsationAvailable() ? "block" : "none";
        flickerSpeedSelect.parentElement.style.display = isFlickeringAvailable()
          ? "block"
          : "none";
        trembleSpeedSelect.parentElement.style.display = isTremblingAvailable()
          ? "block"
          : "none";
      }
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
    } else {
      console.error(`Невідома категорія: ${category}`);
    }

    const currentDifficulty = DifficultyModule.getDifficulty();
    DifficultyModule.updateDifficultyOptions(category);
    if (difficultySelect) {
      difficultySelect.value = currentDifficulty;
    } else {
      console.warn(
        "difficultySelect не знайдено, пропускаємо присвоєння значення"
      );
    }
    CardsSliderModule.updateSlider(numberOfSymbols);
    updateMainSettingsCheckboxes();
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
    console.log("Початок гри, trembleSpeed:", trembleSpeedSelect.value);
    StateModule.resetGameState();
    GameCoreModule.startGame();
    closeModal();

    // Логика для логів
    if (showLogsCheckbox.checked) {
      document.getElementById("logsToggleContainer").style.display = "flex";
      document.getElementById("logsContainer").style.display = "block";
      document.getElementById("scrollToBottomLabel").style.display =
        "inline-flex";
    } else {
      document.getElementById("logsToggleContainer").style.display = "none";
      document.getElementById("logsContainer").style.display = "none";
      document.getElementById("scrollToBottomLabel").style.display = "none";
    }

    // Логика для підсвічування
    if (!showHighlightButtonCheckbox.checked) {
      document.getElementById("highlightMainCardsButton").style.display =
        "none";
      document.getElementById(
        "blinkHighlightRadio"
      ).parentElement.style.display = "none";
      document.getElementById(
        "singleHighlightRadio"
      ).parentElement.style.display = "none";
    } else {
      document.getElementById("highlightMainCardsButton").style.display =
        "inline-block";
      document.getElementById(
        "blinkHighlightRadio"
      ).parentElement.style.display = "block";
      document.getElementById(
        "singleHighlightRadio"
      ).parentElement.style.display = "block";
    }

    // Логика для підказок
    if (!showHintButtonCheckbox.checked) {
      document.getElementById("showHintButton").style.display = "none";
      document.getElementById("autoHintRadio").parentElement.style.display =
        "none";
      document.getElementById("manualHintRadio").parentElement.style.display =
        "none";
    } else {
      document.getElementById("showHintButton").style.display = "inline-block";
      document.getElementById("autoHintRadio").parentElement.style.display =
        "block";
      document.getElementById("manualHintRadio").parentElement.style.display =
        "block";
    }

    // Логика для зупинки пульсації
    if (!showStopPulsationButtonCheckbox.checked) {
      document.getElementById("stopPulsationButton").style.display = "none";
      document.getElementById(
        "permanentStopPulsationRadio"
      ).parentElement.style.display = "none";
      document.getElementById(
        "temporaryStopPulsationRadio"
      ).parentElement.style.display = "none";
      document.getElementById(
        "dependOnCardElementsCheckbox"
      ).parentElement.style.display = "none";
    } else {
      document.getElementById("stopPulsationButton").style.display =
        "inline-block";
      document.getElementById(
        "permanentStopPulsationRadio"
      ).parentElement.style.display = "block";
      document.getElementById(
        "temporaryStopPulsationRadio"
      ).parentElement.style.display = "block";
      document.getElementById(
        "dependOnCardElementsCheckbox"
      ).parentElement.style.display = MainModalModule.getDependOnCardElements()
        ? "block"
        : "none";
    }

    // Логика для зупинки миготіння
    if (!showStopBlinkButtonCheckbox.checked || !isFlickeringAvailable()) {
      document.getElementById("stopBlinkButton").style.display = "none";
      document.getElementById(
        "permanentStopBlinkRadio"
      ).parentElement.style.display = "none";
      document.getElementById(
        "temporaryStopBlinkRadio"
      ).parentElement.style.display = "none";
      document.getElementById(
        "dependOnCardElementsBlinkCheckbox"
      ).parentElement.style.display = "none";
    } else {
      document.getElementById("stopBlinkButton").style.display = "inline-block";
      document.getElementById(
        "permanentStopBlinkRadio"
      ).parentElement.style.display = "block";
      document.getElementById(
        "temporaryStopBlinkRadio"
      ).parentElement.style.display = "block";
      document.getElementById(
        "dependOnCardElementsBlinkCheckbox"
      ).parentElement.style.display =
        MainModalModule.getDependOnCardElementsBlink() ? "block" : "none";
    }

    // Логика для зупинки дрижання
    if (!showStopTremblingButtonCheckbox.checked || !isTremblingAvailable()) {
      document.getElementById("stopTremblingButton").style.display = "none";
      document.getElementById(
        "permanentStopTremblingRadio"
      ).parentElement.style.display = "none";
      document.getElementById(
        "temporaryStopTremblingRadio"
      ).parentElement.style.display = "none";
      document.getElementById(
        "dependOnCardElementsTremblingCheckbox"
      ).parentElement.style.display = "none";
    } else {
      document.getElementById("stopTremblingButton").style.display =
        "inline-block";
      document.getElementById(
        "permanentStopTremblingRadio"
      ).parentElement.style.display = "block";
      document.getElementById(
        "temporaryStopTremblingRadio"
      ).parentElement.style.display = "block";
      document.getElementById(
        "dependOnCardElementsTremblingCheckbox"
      ).parentElement.style.display =
        MainModalModule.getDependOnCardElementsTrembling() ? "block" : "none";
    }

    // Логика для зупинки загального таймера
    if (!showStopGeneralTimerCheckbox.checked) {
      document.getElementById("stopGeneralTimerButton").style.display = "none";
      document.getElementById(
        "resetGeneralTimerRadio"
      ).parentElement.style.display = "none";
      document.getElementById(
        "pauseGeneralTimerRadio"
      ).parentElement.style.display = "none";
    } else {
      document.getElementById("stopGeneralTimerButton").style.display =
        "inline-block";
      document.getElementById(
        "resetGeneralTimerRadio"
      ).parentElement.style.display = "block";
      document.getElementById(
        "pauseGeneralTimerRadio"
      ).parentElement.style.display = "block";
    }

    // Логика для зупинки таймера знаходження пари
    if (!showStopPartialTimerCheckbox.checked) {
      document.getElementById("stopPartialTimerButton").style.display = "none";
      document.getElementById(
        "resetPartialTimerRadio"
      ).parentElement.style.display = "none";
      document.getElementById(
        "pausePartialTimerRadio"
      ).parentElement.style.display = "none";
    } else {
      document.getElementById("stopPartialTimerButton").style.display =
        "inline-block";
      document.getElementById(
        "resetPartialTimerRadio"
      ).parentElement.style.display = "block";
      document.getElementById(
        "pausePartialTimerRadio"
      ).parentElement.style.display = "block";
    }

    TimerWindowModule.startTimers();
  });

  elementCategorySelect.addEventListener("change", updateMainOptions);

  difficultySelect?.addEventListener("change", () => {
    console.log(`Змінено рівень складності на: ${difficultySelect.value}`);
    updateMainOptions();
  });

  [
    numSymbolsNumbersSelect,
    numSymbolsImagesSelect,
    numSymbolsHieroglyphsSelect,
    numSymbolsWordsSelect,
  ].forEach((select) => {
    select.addEventListener("change", () => {
      const numberOfSymbols = parseInt(select.value);
      CardsSliderModule.updateSlider(numberOfSymbols);
      HintsCoreModule.StopPulsationModule.resetTimerLabel();
      HintsCoreModule.StopBlinkModule.resetTimerLabel();
      HintsCoreModule.StopTremblingModule.resetTimerLabel();
      updateMainSettingsCheckboxes();
    });
  });

  imageThemeSelect.addEventListener("change", updateNumSymbolsImagesOptions);

  modificationSelect.addEventListener("change", function () {
    pulsationSpeedSelect.parentElement.style.display = isPulsationAvailable()
      ? "block"
      : "none";
    flickerSpeedSelect.parentElement.style.display = isFlickeringAvailable()
      ? "block"
      : "none";
    trembleSpeedSelect.parentElement.style.display = isTremblingAvailable()
      ? "block"
      : "none";
    updateMainSettingsCheckboxes();
  });

  showStopPulsationButtonCheckbox.addEventListener(
    "change",
    updateMainSettingsCheckboxes
  );
  showStopBlinkButtonCheckbox.addEventListener(
    "change",
    updateMainSettingsCheckboxes
  );
  showStopTremblingButtonCheckbox.addEventListener(
    "change",
    updateMainSettingsCheckboxes
  );

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
      return 4;
    },
    getImageTheme: () => imageThemeSelect.value,
    getShowDeck: () => showDeckCheckbox.checked,
    getShowLogs: () => showLogsCheckbox.checked,
    getShowHighlightButton: () => showHighlightButtonCheckbox.checked,
    getShowHintButton: () => showHintButtonCheckbox.checked,
    getShowStopPulsationButton: () => showStopPulsationButtonCheckbox.checked,
    getShowStopBlinkButton: () => showStopBlinkButtonCheckbox.checked,
    getShowStopTremblingButton: () => showStopTremblingButtonCheckbox.checked,
    getShowStopGeneralTimer: () => showStopGeneralTimerCheckbox.checked,
    getShowStopPartialTimer: () => showStopPartialTimerCheckbox.checked,
    getDependOnCardElements: () => dependOnCardElementsCheckbox.checked,
    getDependOnCardElementsBlink: () =>
      dependOnCardElementsBlinkCheckbox.checked,
    getDependOnCardElementsTrembling: () =>
      dependOnCardElementsTremblingCheckbox.checked,
    getPulsationSpeed: () => pulsationSpeedSelect.value,
    getFlickerSpeed: () => flickerSpeedSelect.value,
    getTrembleSpeed: () => {
      const speed = trembleSpeedSelect.value;
      console.log("Отримано trembleSpeed:", speed);
      return speed;
    },
    getModification: () => modificationSelect.value,
    updateMainOptions,
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
  // Список ієрогліфів для категорії "ієрогліфи"
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

  // Список слів для категорії "слова"
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

  // Отримуємо елементи DOM для вибору рівня складності, категорії та модифікації
  const difficultyLevelSelect = document.getElementById("difficultyLevel");
  const elementCategorySelect = document.getElementById("elementCategory");
  const pulsationSpeedContainer = document.getElementById(
    "pulsationSpeedContainer"
  );
  const modificationContainer = document.getElementById(
    "modificationContainer"
  );

  // Модуль для керування рівнями складності
  const CoreDifficulty = (function () {
    // Об'єкт для зберігання вибору складності для кожної категорії
    const difficultySelections = {
      numbers: "light",
      images: "light",
      hieroglyphs: "light",
      words: "light",
    };

    // Оновлює опції рівня складності залежно від категорії та відновлює попередній вибір
    function updateDifficultyOptions(category) {
      console.log(
        `Оновлення опцій рівня складності для категорії: ${category}`
      );
      let options = "";
      if (category === "numbers") {
        options = `
          <option value="light">Легкий</option>
          <option value="medium">Середній</option>
          <option value="medium_modified">Середній модифікований</option>
        `;
      } else if (category === "images" || category === "hieroglyphs") {
        options = `
          <option value="light">Легкий</option>
          <option value="medium">Середній</option>
        `;
      } else if (category === "words") {
        options = `<option value="light">Легкий</option>`;
      } else {
        console.error(`Невідома категорія: ${category}`);
        return;
      }
      difficultyLevelSelect.innerHTML = options;

      // Відновлюємо попередній вибір для категорії, якщо він є
      if (difficultySelections[category]) {
        difficultyLevelSelect.value = difficultySelections[category];
      } else {
        difficultyLevelSelect.value = difficultyLevelSelect.options[0].value;
        difficultySelections[category] = difficultyLevelSelect.value;
      }

      updateModificationVisibility(category, difficultyLevelSelect.value);
    }

    // Оновлює видимість контейнерів модифікації та швидкості пульсації
    function updateModificationVisibility(category, difficulty) {
      console.log(
        `Оновлення видимості модифікації: категорія=${category}, складність=${difficulty}`
      );
      const normalizedDifficulty =
        difficulty === "mediumModifiedLevel" ? "medium_modified" : difficulty;
      if (
        category === "numbers" &&
        normalizedDifficulty === "medium_modified"
      ) {
        modificationContainer.style.display = "block";
        pulsationSpeedContainer.style.display = "block";
      } else {
        modificationContainer.style.display = "none";
        pulsationSpeedContainer.style.display = "none";
      }
    }

    // Отримує вибраний рівень складності
    function getDifficulty() {
      let difficulty = difficultyLevelSelect.value;
      if (difficulty === "mediumModifiedLevel") {
        console.warn(
          `Некоректне значення рівня складності: "${difficulty}". Виправлено на "medium_modified".`
        );
        difficulty = "medium_modified";
      }
      return difficulty;
    }

    // Обробник зміни категорії
    elementCategorySelect.addEventListener("change", () => {
      const category = elementCategorySelect.value;
      updateDifficultyOptions(category);
    });

    // Обробник зміни рівня складності
    difficultyLevelSelect.addEventListener("change", () => {
      const category = elementCategorySelect.value;
      const difficulty = difficultyLevelSelect.value;
      // Зберігаємо вибір складності для поточної категорії
      difficultySelections[category] = difficulty;
      console.log(
        `Збережено вибір складності: категорія=${category}, складність=${difficulty}`
      );
      updateModificationVisibility(category, difficulty);
    });

    // Ініціалізація опцій при завантаженні сторінки
    document.addEventListener("DOMContentLoaded", () => {
      const category = elementCategorySelect.value || "numbers";
      updateDifficultyOptions(category);
    });

    return {
      updateDifficultyOptions,
      getDifficulty,
    };
  })();

  // Логіка для категорії "цифри"
  const NumbersLogic = (function () {
    const LightLevelNumbersLogic = (function () {
      function generateLightLevelNumbersDobbleDeck(numberOfSymbols) {
        console.log(
          `Генерація колоди чисел: кількість символів=${numberOfSymbols}`
        );
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
        console.log("Згенерована колода (Легкий рівень, Цифри):", deck);
        return deck;
      }

      return { generateLightLevelNumbersDobbleDeck };
    })();

    const MediumLevelNumbersLogic = (function () {
      function generateMediumLevelNumbersDobbleDeck(numberOfSymbols) {
        function shuffleArray(array) {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        }
        const beginnerDeck =
          LightLevelNumbersLogic.generateLightLevelNumbersDobbleDeck(
            numberOfSymbols
          );
        const shuffledDeck = beginnerDeck.map((card) => shuffleArray(card));
        console.log(
          "Згенерована колода (Середній рівень, Цифри):",
          shuffledDeck
        );
        return shuffledDeck;
      }

      return { generateMediumLevelNumbersDobbleDeck };
    })();

    const MediumModifiedLevelNumbersLogic = (function () {
      function generateMediumModifiedLevelNumbersLogic(numberOfSymbols) {
        function shuffleArray(array) {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        }
        const beginnerDeck =
          LightLevelNumbersLogic.generateLightLevelNumbersDobbleDeck(
            numberOfSymbols
          );
        const shuffledDeck = beginnerDeck.map((card) => shuffleArray(card));
        console.log(
          "Згенерована колода (Середній модифікований рівень, Цифри):",
          shuffledDeck
        );
        return shuffledDeck;
      }

      function apply(leftCard, rightCard) {
        const modification = MainModalModule.getModification();
        if (modification === "pulsation") {
          PulsationMediumModifiedLevelNumbersLogic.apply(leftCard, rightCard);
        } else if (modification === "flickering") {
          FlickeringMediumModifiedLevelNumbersLogic.apply(leftCard, rightCard);
        } else if (modification === "trembling") {
          TremblingMediumModifiedLevelNumbersLogic.apply(leftCard, rightCard);
        } else {
          console.warn(`Невідома модифікація: ${modification}`);
        }
      }

      function remove(leftCard, rightCard) {
        const modification = MainModalModule.getModification();
        if (modification === "pulsation") {
          PulsationMediumModifiedLevelNumbersLogic.remove(leftCard, rightCard);
        } else if (modification === "flickering") {
          FlickeringMediumModifiedLevelNumbersLogic.remove(leftCard, rightCard);
        } else if (modification === "trembling") {
          TremblingMediumModifiedLevelNumbersLogic.remove(leftCard, rightCard);
        }
      }

      return {
        generateMediumModifiedLevelNumbersLogic,
        apply,
        remove,
      };
    })();

    const PulsationMediumModifiedLevelNumbersLogic = (function () {
      function apply(leftCard, rightCard) {
        console.log("Застосування пульсації з вибраною швидкістю");
        const leftNumberTexts = leftCard.querySelectorAll(".number-text");
        const rightNumberTexts = rightCard.querySelectorAll(".number-text");
        const pulsationSpeed = MainModalModule.getPulsationSpeed();

        const applyPulsation = (text) => {
          text.classList.add("pulsating");
          let currentDuration;
          let cycleCount = 0;

          const possibleDurations = [0.5, 1.0, 1.5];

          const setRandomDuration = () => {
            currentDuration =
              possibleDurations[
                Math.floor(Math.random() * possibleDurations.length)
              ];
            const delay = Math.random() * 0.5;
            text.style.animationDuration = `${currentDuration}s`;
            text.style.animationDelay = `${delay}s`;
          };

          if (pulsationSpeed === "asynchronous") {
            setRandomDuration();
            text.addEventListener("animationiteration", () => {
              cycleCount++;
              if (cycleCount >= 2) {
                if (Math.random() < 0.5) {
                  setRandomDuration();
                }
                cycleCount = 0;
              }
            });
          } else {
            const duration =
              pulsationSpeed === "slow"
                ? 1.5
                : pulsationSpeed === "medium"
                ? 1.0
                : 0.5;
            const delay = Math.random() * 0.5;
            text.style.animationDuration = `${duration}s`;
            text.style.animationDelay = `${delay}s`;
          }
        };

        leftNumberTexts.forEach(applyPulsation);
        rightNumberTexts.forEach(applyPulsation);
      }

      function remove(leftCard, rightCard) {
        const leftNumberTexts = leftCard.querySelectorAll(".number-text");
        const rightNumberTexts = rightCard.querySelectorAll(".number-text");

        leftNumberTexts.forEach((text) => {
          text.classList.remove(
            "pulsating",
            "pulsating-slow",
            "pulsating-medium",
            "pulsating-fast",
            "pulsating-asynchronous"
          );
          text.style.removeProperty("animation-duration");
          text.style.removeProperty("animation-delay");
        });
        rightNumberTexts.forEach((text) => {
          text.classList.remove(
            "pulsating",
            "pulsating-slow",
            "pulsating-medium",
            "pulsating-fast",
            "pulsating-asynchronous"
          );
          text.style.removeProperty("animation-duration");
          text.style.removeProperty("animation-delay");
        });
      }

      return { apply, remove };
    })();

    const FlickeringMediumModifiedLevelNumbersLogic = (function () {
      function apply(leftCard, rightCard) {
        console.log("Застосування миготіння з вибраною швидкістю");
        const leftNumberTexts = leftCard.querySelectorAll(".number-text");
        const rightNumberTexts = rightCard.querySelectorAll(".number-text");
        const flickerSpeed = MainModalModule.getFlickerSpeed();

        const applyFlicker = (text) => {
          if (flickerSpeed === "asynchronous") {
            text.classList.add("flickering-asynchronous");
            let currentDuration;
            let cycleCount = 0;

            const possibleDurations = [0.5, 0.8, 1.2, 1.5];

            const setRandomDuration = () => {
              currentDuration =
                possibleDurations[
                  Math.floor(Math.random() * possibleDurations.length)
                ];
              const delay = Math.random() * 0.5;
              text.style.animationDuration = `${currentDuration}s`;
              text.style.animationDelay = `${delay}s`;
            };

            setRandomDuration();
            const iterationHandler = () => {
              cycleCount++;
              if (cycleCount >= 2) {
                if (Math.random() < 0.5) {
                  setRandomDuration();
                }
                cycleCount = 0;
              }
            };

            text.addEventListener("animationiteration", iterationHandler);
            text._iterationHandler = iterationHandler;
          } else {
            const flickerClass =
              {
                slow: "flickering-slow",
                medium: "flickering-medium",
                fast: "flickering-fast",
              }[flickerSpeed] || "flickering-medium";
            text.classList.add(flickerClass);
            const delay = Math.random() * 0.5;
            text.style.animationDelay = `${delay}s`;
          }
        };

        leftNumberTexts.forEach(applyFlicker);
        rightNumberTexts.forEach(applyFlicker);
      }

      function remove(leftCard, rightCard) {
        const leftNumberTexts = leftCard.querySelectorAll(".number-text");
        const rightNumberTexts = rightCard.querySelectorAll(".number-text");

        leftNumberTexts.forEach((text) => {
          text.classList.remove(
            "flickering-slow",
            "flickering-medium",
            "flickering-fast",
            "flickering-asynchronous"
          );
          text.style.removeProperty("animation-delay");
          if (text._iterationHandler) {
            text.removeEventListener(
              "animationiteration",
              text._iterationHandler
            );
            delete text._iterationHandler;
          }
        });

        rightNumberTexts.forEach((text) => {
          text.classList.remove(
            "flickering-slow",
            "flickering-medium",
            "flickering-fast",
            "flickering-asynchronous"
          );
          text.style.removeProperty("animation-delay");
          if (text._iterationHandler) {
            text.removeEventListener(
              "animationiteration",
              text._iterationHandler
            );
            delete text._iterationHandler;
          }
        });
      }

      return { apply, remove };
    })();

	 const TremblingMediumModifiedLevelNumbersLogic = (function () {
     function apply(leftCard, rightCard) {
       console.log("Застосування ефекту дрижання з вибраною швидкістю");
       const leftNumberElements = leftCard.querySelectorAll(".number-text");
       const rightNumberElements = rightCard.querySelectorAll(".number-text");
       const trembleSpeed = MainModalModule.getTrembleSpeed();
       console.log("Вибрана швидкість тремтіння:", trembleSpeed);

       const tremblePatterns = [
         "tremble-pattern-1",
         "tremble-pattern-2",
         "tremble-pattern-3",
         "tremble-pattern-4",
       ];

       const applyTremble = (element) => {
         // Видаляємо всі попередні класи тремтіння
         element.classList.remove(
           "trembling-slow",
           "trembling-medium",
           "trembling-fast",
           "trembling-asynchronous",
           "trembling-stopped"
         );
         console.log(
           "Застосовано тремтіння до елемента:",
           element,
           "Швидкість:",
           trembleSpeed
         );

         // Випадкова величина зміщення (32–65px)
         const offset = 32 + Math.random() * 33; // 32px до 65px
         element.style.setProperty("--tremble-offset", `${offset}px`);

         if (trembleSpeed === "asynchronous") {
           element.classList.add("trembling-asynchronous");
           const possibleDurations = [0.5, 1.5, 3.0, 7.5, 10.5];

           const setRandomAnimation = () => {
             // З ймовірністю 50% змінюємо тривалість і шаблон
             if (Math.random() < 0.5) {
               const duration =
                 possibleDurations[
                   Math.floor(Math.random() * possibleDurations.length)
                 ];
               const delay = Math.random(); // Затримка 0–1с
               const pattern =
                 tremblePatterns[
                   Math.floor(Math.random() * tremblePatterns.length)
                 ];
               const newOffset = 32 + Math.random() * 33; // Нова величина зміщення
               console.log(
                 "Асинхронна тривалість:",
                 duration,
                 "Затримка:",
                 delay,
                 "Шаблон:",
                 pattern,
                 "Зміщення:",
                 newOffset,
                 "Елемент:",
                 element
               );
               element.style.animation = `${pattern} ${duration}s ease-in-out infinite`;
               element.style.animationDelay = `${delay}s`;
               element.style.setProperty("--tremble-offset", `${newOffset}px`);
               console.log(
                 "Застосовано стиль анімації:",
                 element.style.animation
               );
             } else {
               console.log(
                 "Тривалість і шаблон не змінено для елемента:",
                 element
               );
             }
           };

           // Встановлюємо початкову анімацію
           const initialDuration =
             possibleDurations[
               Math.floor(Math.random() * possibleDurations.length)
             ];
           const initialDelay = Math.random(); // Затримка 0–1с
           const initialPattern =
             tremblePatterns[
               Math.floor(Math.random() * tremblePatterns.length)
             ];
           element.style.animation = `${initialPattern} ${initialDuration}s ease-in-out infinite`;
           element.style.animationDelay = `${initialDelay}s`;
           console.log(
             "Початкова асинхронна тривалість:",
             initialDuration,
             "Затримка:",
             initialDelay,
             "Шаблон:",
             initialPattern,
             "Зміщення:",
             offset,
             "Елемент:",
             element
           );
           console.log("Початковий стиль анімації:", element.style.animation);

           const iterationHandler = () => {
             console.log("Цикл анімації завершено для елемента:", element);
             setRandomAnimation(); // Перевіряємо зміну після кожного циклу
           };

           element.addEventListener("animationiteration", iterationHandler);
           element._iterationHandler = iterationHandler;
         } else {
           const trembleClass =
             {
               slow: "trembling-slow",
               medium: "trembling-medium",
               fast: "trembling-fast",
             }[trembleSpeed] || "trembling-medium";
           element.classList.add(trembleClass);
           const delay = Math.random(); // Затримка 0–1с
           const pattern =
             tremblePatterns[
               Math.floor(Math.random() * tremblePatterns.length)
             ];
           console.log(
             "Фіксована тривалість, клас:",
             trembleClass,
             "Затримка:",
             delay,
             "Шаблон:",
             pattern,
             "Зміщення:",
             offset
           );
           element.style.animation = `${pattern} ${
             trembleSpeed === "slow" ? 10.5 : trembleSpeed === "fast" ? 1.5 : 5.5
           }s ease-in-out infinite`;
           element.style.animationDelay = `${delay}s`;
         }
       };

       leftNumberElements.forEach(applyTremble);
       rightNumberElements.forEach(applyTremble);
     }

     function remove(leftCard, rightCard) {
       console.log("Видалення ефекту дрижання");
       const leftNumberElements = leftCard.querySelectorAll(".number-text");
       const rightNumberElements = rightCard.querySelectorAll(".number-text");

       const removeTremble = (element) => {
         element.classList.remove(
           "trembling-slow",
           "trembling-medium",
           "trembling-fast",
           "trembling-asynchronous"
         );
         element.classList.add("trembling-stopped");
         element.style.removeProperty("animation");
         element.style.removeProperty("animation-delay");
         element.style.removeProperty("--tremble-offset");
         console.log(
           "Видалено класи тремтіння, додано trembling-stopped:",
           element.classList
         );
         if (element._iterationHandler) {
           element.removeEventListener(
             "animationiteration",
             element._iterationHandler
           );
           delete element._iterationHandler;
           console.log("Видалено обробник animationiteration");
         }
       };

       leftNumberElements.forEach(removeTremble);
       rightNumberElements.forEach(removeTremble);
     }

     return {
       apply,
       remove,
     };
   })();

    return {
      generateLightLevelNumbersDobbleDeck:
        LightLevelNumbersLogic.generateLightLevelNumbersDobbleDeck,
      generateMediumLevelNumbersDobbleDeck:
        MediumLevelNumbersLogic.generateMediumLevelNumbersDobbleDeck,
      generateMediumModifiedLevelNumbersLogic:
        MediumModifiedLevelNumbersLogic.generateMediumModifiedLevelNumbersLogic,
      MediumModifiedLevelNumbersLogic,
      PulsationMediumModifiedLevelNumbersLogic,
      FlickeringMediumModifiedLevelNumbersLogic,
      TremblingMediumModifiedLevelNumbersLogic,
    };
  })();

  // Логіка для категорії "зображення"
  const ImagesLogic = (function () {
    const LightLevelImagesLogic = (function () {
      function generateLightLevelImagesDobbleDeck(numberOfSymbols, theme) {
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
        console.log("Згенерована колода (Легкий рівень, Зображення):", deck);
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

      return { generateLightLevelImagesDobbleDeck, prepareCards };
    })();

    const MediumLevelImagesLogic = (function () {
      function generateMediumLevelImagesDobbleDeck(numberOfSymbols, theme) {
        function shuffleArray(array) {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        }
        const beginnerDeck =
          LightLevelImagesLogic.generateLightLevelImagesDobbleDeck(
            numberOfSymbols,
            theme
          );
        const shuffledDeck = beginnerDeck.map((card) => shuffleArray(card));
        console.log(
          "Згенерована колода (Середній рівень, Зображення):",
          shuffledDeck
        );
        return shuffledDeck;
      }

      return { generateMediumLevelImagesDobbleDeck };
    })();

    return {
      generateLightLevelImagesDobbleDeck:
        LightLevelImagesLogic.generateLightLevelImagesDobbleDeck,
      generateMediumLevelImagesDobbleDeck:
        MediumLevelImagesLogic.generateMediumLevelImagesDobbleDeck,
      LightLevelImagesLogic: LightLevelImagesLogic,
    };
  })();

  // Логіка для категорії "ієрогліфи"
  const HieroglyphsLogic = (function () {
    const LightLevelHieroglyphsLogic = (function () {
      function generateLightLevelHieroglyphsDobbleDeck(numberOfSymbols) {
        if (numberOfSymbols > 5) {
          console.error(
            `Кількість символів (${numberOfSymbols}) занадто велика для ієрогліфів. Максимум 5.`
          );
          return [];
        }
        const n = numberOfSymbols - 1;
        const totalCards = n * n + n + 1;
        const totalSymbolsNeeded = n * n + n + 1;

        if (totalSymbolsNeeded > hieroglyphsList.length) {
          console.error(
            `Недостатньо ієрогліфів для генерації колоди! Потрібно ${totalSymbolsNeeded}, доступно ${hieroglyphsList.length}.`
          );
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
        console.log("Згенерована колода (Легкий рівень, Ієрогліфи):", deck);
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

      return { generateLightLevelHieroglyphsDobbleDeck, prepareCards };
    })();

    const MediumLevelHieroglyphsLogic = (function () {
      function generateMediumLevelHieroglyphsDobbleDeck(numberOfSymbols) {
        if (numberOfSymbols > 5) {
          console.error(
            `Кількість символів (${numberOfSymbols}) занадто велика для ієрогліфів. Максимум 5.`
          );
          return [];
        }
        function shuffleArray(array) {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        }
        const beginnerDeck =
          LightLevelHieroglyphsLogic.generateLightLevelHieroglyphsDobbleDeck(
            numberOfSymbols
          );
        const shuffledDeck = beginnerDeck.map((card) => shuffleArray(card));
        console.log(
          "Згенерована колода (Середній рівень, Ієрогліфи):",
          shuffledDeck
        );
        return shuffledDeck;
      }

      return { generateMediumLevelHieroglyphsDobbleDeck };
    })();

    return {
      generateLightLevelHieroglyphsDobbleDeck:
        LightLevelHieroglyphsLogic.generateLightLevelHieroglyphsDobbleDeck,
      generateMediumLevelHieroglyphsDobbleDeck:
        MediumLevelHieroglyphsLogic.generateMediumLevelHieroglyphsDobbleDeck,
      LightLevelHieroglyphsLogic: LightLevelHieroglyphsLogic,
    };
  })();

  // Логіка для категорії "слова"
  const WordsLogic = (function () {
    const LightLevelWordsLogic = (function () {
      function generateLightLevelWordsDobbleDeck(numberOfSymbols) {
        if (numberOfSymbols > 5) {
          console.error(
            `Кількість символів (${numberOfSymbols}) занадто велика для слів. Максимум 5.`
          );
          return [];
        }
        const n = numberOfSymbols - 1;
        const totalCards = n * n + n + 1;
        const totalSymbolsNeeded = n * n + n + 1;

        if (totalSymbolsNeeded > wordsList.length) {
          console.error(
            `Недостатньо слів для генерації колоди! Потрібно ${totalSymbolsNeeded}, доступно ${wordsList.length}.`
          );
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
        console.log("Згенерована колода (Легкий рівень, Слова):", deck);
        return deck;
      }

      function findCommonSymbol(leftCard, rightCard) {
        return leftCard.find((symbol) => rightCard.includes(symbol));
      }

      function alignCommonSymbol(leftCard, rightCard, rightCardIndex, deck) {
        const commonSymbol = findCommonSymbol(leftCard, rightCard);
        if (!commonSymbol) {
          console.error("Спільний символ не знайдено!");
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

      return { generateLightLevelWordsDobbleDeck, prepareCards };
    })();

    return {
      generateLightLevelWordsDobbleDeck:
        LightLevelWordsLogic.generateLightLevelWordsDobbleDeck,
      LightLevelWordsLogic: LightLevelWordsLogic,
    };
  })();

  // Генерує колоду залежно від категорії, рівня складності та кількості символів
  function generateDeck(category, difficulty, numberOfSymbols, theme) {
    const normalizedDifficulty =
      difficulty === "mediumModifiedLevel" ? "medium_modified" : difficulty;
    console.log(
      `Генерація колоди: категорія=${category}, складність=${normalizedDifficulty}, кількість символів=${numberOfSymbols}, тема=${theme}`
    );

    let deck = [];
    if (category === "numbers") {
      if (numberOfSymbols < 2) {
        console.error(
          `Кількість символів (${numberOfSymbols}) замала для чисел. Мінімум 2.`
        );
        return [];
      }
      if (normalizedDifficulty === "light") {
        deck =
          NumbersLogic.generateLightLevelNumbersDobbleDeck(numberOfSymbols);
      } else if (normalizedDifficulty === "medium") {
        deck =
          NumbersLogic.generateMediumLevelNumbersDobbleDeck(numberOfSymbols);
      } else if (normalizedDifficulty === "medium_modified") {
        deck =
          NumbersLogic.generateMediumModifiedLevelNumbersLogic(numberOfSymbols);
      } else {
        console.error(
          `Невідомий рівень складності для чисел: ${normalizedDifficulty}`
        );
        return [];
      }
    } else if (category === "images") {
      if (numberOfSymbols < 2) {
        console.error(
          `Кількість символів (${numberOfSymbols}) замала для зображень. Мінімум 2.`
        );
        return [];
      }
      if (normalizedDifficulty === "light") {
        deck = ImagesLogic.generateLightLevelImagesDobbleDeck(
          numberOfSymbols,
          theme
        );
      } else if (normalizedDifficulty === "medium") {
        deck = ImagesLogic.generateMediumLevelImagesDobbleDeck(
          numberOfSymbols,
          theme
        );
      } else {
        console.error(
          `Невідомий рівень складності для зображень: ${normalizedDifficulty}`
        );
        return [];
      }
    } else if (category === "hieroglyphs") {
      if (numberOfSymbols > 5) {
        console.error(
          `Кількість символів (${numberOfSymbols}) занадто велика для ієрогліфів. Максимум 5.`
        );
        return [];
      }
      if (normalizedDifficulty === "light") {
        deck =
          HieroglyphsLogic.generateLightLevelHieroglyphsDobbleDeck(
            numberOfSymbols
          );
      } else if (normalizedDifficulty === "medium") {
        deck =
          HieroglyphsLogic.generateMediumLevelHieroglyphsDobbleDeck(
            numberOfSymbols
          );
      } else {
        console.error(
          `Невідомий рівень складності для ієрогліфів: ${normalizedDifficulty}`
        );
        return [];
      }
    } else if (category === "words") {
      if (numberOfSymbols > 5) {
        console.error(
          `Кількість символів (${numberOfSymbols}) занадто велика для слів. Максимум 5.`
        );
        return [];
      }
      if (normalizedDifficulty === "light") {
        deck = WordsLogic.generateLightLevelWordsDobbleDeck(numberOfSymbols);
      } else {
        console.error(
          `Невідомий рівень складності для слів: ${normalizedDifficulty}`
        );
        return [];
      }
    } else {
      console.error(`Невідома категорія: ${category}`);
      return [];
    }
    if (deck.length === 0) {
      console.error(
        `Не вдалося згенерувати колоду для категорії=${category}, складності=${normalizedDifficulty}, кількості символів=${numberOfSymbols}`
      );
    } else {
      console.log(
        `Згенерована колода для категорії ${category}, складності ${normalizedDifficulty}:`,
        deck
      );
    }
    return deck;
  }

  return {
    NumbersLogic,
    ImagesLogic,
    HieroglyphsLogic,
    WordsLogic,
    updateDifficultyOptions: CoreDifficulty.updateDifficultyOptions,
    getDifficulty: CoreDifficulty.getDifficulty,
    generateDeck,
  };
})();

// Модуль "Ядро підказок" через IIFE
const HintsCoreModule = (function () {
  // Модуль "Зупинити загальний таймер" через IIFE
  const StopGeneralTimerModule = (function () {
    let resetTimeoutId = null; // Зберігаємо ID setTimeout
    let countdownIntervalId = null; // Зберігаємо ID setInterval для відліку
    let isResetDelayActive = false; // Відстежуємо, чи активна затримка
    let isResetting = false; // Блокуємо повторні виклики обнулення

    // Функція для оновлення тексту кнопки
    function updateButtonText() {
      const stopButton = document.getElementById("stopGeneralTimerButton");
      if (!stopButton) {
        console.error("Не вдалося знайти stopGeneralTimerButton");
        return;
      }
      if (document.getElementById("pauseGeneralTimerRadio").checked) {
        stopButton.textContent = "Зупинити загальний таймер";
      } else if (document.getElementById("resetGeneralTimerRadio").checked) {
        stopButton.textContent = "Обнулити загальний таймер";
      }
    }

    const ResetGeneralTimerLogic = (function () {
      function reset() {
        if (isResetting) {
          console.log(
            "Обнулення загального таймера вже виконується, пропускаємо"
          );
          return;
        }
        isResetting = true; // Блокуємо нові виклики
        console.log("Запуск ResetGeneralTimerLogic.reset");
        TimerWindowModule.TotalTimeLogic.stop();
        StateModule.getGameState().totalTimeMs = 0;
        StateModule.getGameState().isGeneralTimerPaused = false;
        isResetDelayActive = true; // Позначаємо, що затримка активна
        console.log("Очікування 2 секунди перед запуском таймера");

        // Початок зворотного відліку
        let countdownTime = 2.0; // Початковий час у секундах
        StateModule.getDOMCache().totalTimeTimer.textContent = `${TimerWindowModule.formatTime(
          0
        )} (${countdownTime.toFixed(1)} с)`;
        countdownIntervalId = setInterval(() => {
          countdownTime -= 0.1;
          if (countdownTime <= 0) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
            StateModule.getDOMCache().totalTimeTimer.textContent =
              TimerWindowModule.formatTime(0);
            console.log("Зворотний відлік завершено");
          } else {
            StateModule.getDOMCache().totalTimeTimer.textContent = `${TimerWindowModule.formatTime(
              0
            )} (${countdownTime.toFixed(1)} с)`;
          }
        }, 100); // Оновлення кожні 100 мс

        resetTimeoutId = setTimeout(() => {
          clearInterval(countdownIntervalId); // Очищаємо відлік
          countdownIntervalId = null;
          StateModule.getDOMCache().totalTimeTimer.textContent =
            TimerWindowModule.formatTime(0);
          if (!StateModule.getGameState().isGeneralTimerPaused) {
            TimerWindowModule.TotalTimeLogic.start();
            console.log("Загальний таймер запущено після затримки");
          } else {
            console.log("Запуск таймера скасовано через зупинку");
          }
          isResetDelayActive = false; // Затримка завершена
          isResetting = false; // Розблокуємо виклики
          resetTimeoutId = null; // Очищаємо ID
        }, 2000); // Затримка 2 секунди
        console.log("Загальний таймер обнулено");
      }

      return { reset };
    })();

    const PauseGeneralTimerLogic = (function () {
      function pause() {
        console.log("Запуск PauseGeneralTimerLogic.pause");
        TimerWindowModule.TotalTimeLogic.stop();
        StateModule.getGameState().isGeneralTimerPaused = true;
        if (isResetDelayActive && resetTimeoutId) {
          clearTimeout(resetTimeoutId); // Скасовуємо запуск таймера
          resetTimeoutId = null;
          isResetting = false; // Розблокуємо
          console.log("Затримка обнулення скасована через зупинку");
        }
        if (countdownIntervalId) {
          clearInterval(countdownIntervalId); // Скасовуємо відлік
          countdownIntervalId = null;
          StateModule.getDOMCache().totalTimeTimer.textContent =
            TimerWindowModule.formatTime(0);
          console.log("Зворотний відлік зупинено через паузу");
        }
        console.log("Загальний таймер зупинено");
      }

      function resume() {
        console.log("Запуск PauseGeneralTimerLogic.resume");
        if (!StateModule.getGameState().isGeneralTimerPaused) {
          console.log("Таймер уже активний, пропускаємо resume");
          return;
        }
        TimerWindowModule.TotalTimeLogic.start();
        StateModule.getGameState().isGeneralTimerPaused = false;
        console.log("Загальний таймер відновлено");
      }

      function toggle() {
        console.log("Запуск PauseGeneralTimerLogic.toggle");
        if (StateModule.getGameState().isGeneralTimerPaused) {
          resume();
        } else {
          pause();
        }
      }

      return { pause, resume, toggle };
    })();

    function toggleGeneralTimer() {
      console.log("Запуск toggleGeneralTimer");
      if (document.getElementById("resetGeneralTimerRadio").checked) {
        ResetGeneralTimerLogic.reset();
      } else if (document.getElementById("pauseGeneralTimerRadio").checked) {
        PauseGeneralTimerLogic.toggle();
      }
    }

    function resetState() {
      console.log("Запуск resetState (StopGeneralTimerModule)");
      if (StateModule.getGameState().isGeneralTimerPaused) {
        PauseGeneralTimerLogic.resume();
      }
      StateModule.getGameState().isGeneralTimerPaused = false;
      if (isResetDelayActive && resetTimeoutId) {
        clearTimeout(resetTimeoutId); // Скасовуємо затримку
        resetTimeoutId = null;
        isResetting = false; // Розблокуємо
        console.log("Затримка обнулення скасована при скиданні стану");
      }
      if (countdownIntervalId) {
        clearInterval(countdownIntervalId); // Скасовуємо відлік
        countdownIntervalId = null;
        StateModule.getDOMCache().totalTimeTimer.textContent =
          TimerWindowModule.formatTime(0);
        console.log("Зворотний відлік скасовано при скиданні стану");
      }
      isResetDelayActive = false;
      isResetting = false; // Розблокуємо
    }

    // Ініціалізація обробників подій для радіокнопок
    function initialize() {
      const pauseRadio = document.getElementById("pauseGeneralTimerRadio");
      const resetRadio = document.getElementById("resetGeneralTimerRadio");

      if (pauseRadio && resetRadio) {
        pauseRadio.addEventListener("change", updateButtonText);
        resetRadio.addEventListener("change", updateButtonText);
        updateButtonText(); // Встановлюємо початковий текст кнопки
      } else {
        console.error(
          "Не вдалося знайти радіокнопки pauseGeneralTimerRadio або resetGeneralTimerRadio"
        );
      }
    }

    // Викликаємо ініціалізацію
    initialize();

    return {
      toggleGeneralTimer,
      resetState,
      get isGeneralTimerPaused() {
        return StateModule.getGameState().isGeneralTimerPaused;
      },
    };
  })();

  // Модуль "Зупинити таймер знаходження пари" через IIFE
  const StopPartialTimerModule = (function () {
    let resetTimeoutId = null; // Зберігаємо ID setTimeout
    let countdownIntervalId = null; // Зберігаємо ID setInterval для відліку
    let isResetDelayActive = false; // Відстежуємо, чи активна затримка
    let isResetting = false; // Блокуємо повторні виклики обнулення

    // Функція для оновлення тексту кнопки
    function updateButtonText() {
      const stopButton = document.getElementById("stopPartialTimerButton");
      if (!stopButton) {
        console.error("Не вдалося знайти stopPartialTimerButton");
        return;
      }
      if (document.getElementById("pausePartialTimerRadio").checked) {
        stopButton.textContent = "Зупинити таймер знаходження пари";
      } else if (document.getElementById("resetPartialTimerRadio").checked) {
        stopButton.textContent = "Обнулити таймер знаходження пари";
      }
    }

    const ResetPartialTimerLogic = (function () {
      function reset() {
        if (isResetting) {
          console.log(
            "Обнулення таймера знаходження пари вже виконується, пропускаємо"
          );
          return;
        }
        isResetting = true; // Блокуємо нові виклики
        console.log("Запуск ResetPartialTimerLogic.reset");
        TimerWindowModule.PairTimeLogic.stop();
        StateModule.getGameState().pairTimeMs = 0;
        StateModule.getGameState().isPartialTimerPaused = false; // Явно скидаємо стан паузи
        isResetDelayActive = true; // Позначаємо, що затримка активна
        console.log("Очікування 2 секунди перед запуском таймера");

        // Початок зворотного відліку
        let countdownTime = 2.0; // Початковий час у секундах
        StateModule.getDOMCache().pairTimeTimer.textContent = `${TimerWindowModule.formatTime(
          0
        )} (${countdownTime.toFixed(1)} с)`;
        countdownIntervalId = setInterval(() => {
          countdownTime -= 0.1;
          if (countdownTime <= 0) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
            StateModule.getDOMCache().pairTimeTimer.textContent =
              TimerWindowModule.formatTime(0);
            console.log("Зворотний відлік завершено");
          } else {
            StateModule.getDOMCache().pairTimeTimer.textContent = `${TimerWindowModule.formatTime(
              0
            )} (${countdownTime.toFixed(1)} с)`;
          }
        }, 100); // Оновлення кожні 100 мс

        resetTimeoutId = setTimeout(() => {
          clearInterval(countdownIntervalId); // Очищаємо відлік
          countdownIntervalId = null;
          StateModule.getDOMCache().pairTimeTimer.textContent =
            TimerWindowModule.formatTime(0);
          if (!StateModule.getGameState().isPartialTimerPaused) {
            TimerWindowModule.PairTimeLogic.start();
            console.log("Таймер знаходження пари запущено після затримки");
          } else {
            console.log("Запуск таймера скасовано через зупинку");
          }
          isResetDelayActive = false; // Затримка завершена
          isResetting = false; // Розблокуємо виклики
          resetTimeoutId = null; // Очищаємо ID
        }, 2000); // Затримка 2 секунди
        console.log("Таймер знаходження пари обнулено");
      }

      return { reset };
    })();

    const PausePartialTimerLogic = (function () {
      function pause() {
        console.log("Запуск PausePartialTimerLogic.pause");
        TimerWindowModule.PairTimeLogic.stop();
        StateModule.getGameState().isPartialTimerPaused = true;
        if (isResetDelayActive && resetTimeoutId) {
          clearTimeout(resetTimeoutId); // Скасовуємо запуск таймера
          resetTimeoutId = null;
          isResetting = false; // Розблокуємо
          console.log("Затримка обнулення скасована через зупинку");
        }
        if (countdownIntervalId) {
          clearInterval(countdownIntervalId); // Скасовуємо відлік
          countdownIntervalId = null;
          StateModule.getDOMCache().pairTimeTimer.textContent =
            TimerWindowModule.formatTime(StateModule.getGameState().pairTimeMs);
          console.log("Зворотний відлік зупинено через паузу");
        }
        console.log("Таймер знаходження пари зупинено");
      }

      function resume() {
        console.log("Запуск PausePartialTimerLogic.resume");
        if (!StateModule.getGameState().isPartialTimerPaused) {
          console.log("Таймер уже активний, пропускаємо resume");
          return;
        }
        TimerWindowModule.PairTimeLogic.start();
        StateModule.getGameState().isPartialTimerPaused = false;
        console.log("Таймер знаходження пари відновлено");
      }

      function toggle() {
        console.log(
          "Запуск PausePartialTimerLogic.toggle, isPartialTimerPaused:",
          StateModule.getGameState().isPartialTimerPaused
        );
        if (StateModule.getGameState().isPartialTimerPaused) {
          resume();
        } else {
          pause();
        }
      }

      return { pause, resume, toggle };
    })();

    function togglePartialTimer() {
      console.log(
        "Запуск togglePartialTimer, resetRadio:",
        document.getElementById("resetPartialTimerRadio").checked,
        "pauseRadio:",
        document.getElementById("pausePartialTimerRadio").checked
      );
      if (document.getElementById("resetPartialTimerRadio").checked) {
        ResetPartialTimerLogic.reset();
      } else if (document.getElementById("pausePartialTimerRadio").checked) {
        PausePartialTimerLogic.toggle();
      }
    }

    function resetState() {
      console.log("Запуск resetState (StopPartialTimerModule)");
      if (StateModule.getGameState().isPartialTimerPaused) {
        PausePartialTimerLogic.resume();
      }
      StateModule.getGameState().isPartialTimerPaused = false;
      if (isResetDelayActive && resetTimeoutId) {
        clearTimeout(resetTimeoutId); // Скасовуємо затримку
        resetTimeoutId = null;
        isResetting = false; // Розблокуємо
        console.log("Затримка обнулення скасована при скиданні стану");
      }
      if (countdownIntervalId) {
        clearInterval(countdownIntervalId); // Скасовуємо відлік
        countdownIntervalId = null;
        StateModule.getDOMCache().pairTimeTimer.textContent =
          TimerWindowModule.formatTime(0);
        console.log("Зворотний відлік скасовано при скиданні стану");
      }
      isResetDelayActive = false;
      isResetting = false; // Розблокуємо
    }

    // Синхронізація стану після зміни карток або перезапуску таймера
    function syncAfterCardChange() {
      console.log("Запуск syncAfterCardChange (StopPartialTimerModule)");
      TimerWindowModule.PairTimeLogic.stop();
      StateModule.getGameState().pairTimeMs = 0;
      StateModule.getGameState().isPartialTimerPaused = false;
      StateModule.getDOMCache().pairTimeTimer.textContent =
        TimerWindowModule.formatTime(0);
      TimerWindowModule.PairTimeLogic.start();
      console.log(
        "Таймер знаходження пари обнулено та запущено після зміни карток"
      );
    }

    // Ініціалізація обробників подій для радіокнопок
    function initialize() {
      const pauseRadio = document.getElementById("pausePartialTimerRadio");
      const resetRadio = document.getElementById("resetPartialTimerRadio");

      if (pauseRadio && resetRadio) {
        pauseRadio.addEventListener("change", updateButtonText);
        resetRadio.addEventListener("change", updateButtonText);
        updateButtonText(); // Встановлюємо початковий текст кнопки
      } else {
        console.error(
          "Не вдалося знайти радіокнопки pausePartialTimerRadio або resetPartialTimerRadio"
        );
      }
    }

    // Викликаємо ініціалізацію
    initialize();

    return {
      togglePartialTimer,
      resetState,
      syncAfterCardChange,
      get isPartialTimerPaused() {
        return StateModule.getGameState().isPartialTimerPaused;
      },
    };
  })();

  // Модуль "Показати колоду" через IIFE
  const DeckModule = (function () {
    let lastHighlightedInitialCardIndex = null;
    let lastHighlightedUsedCardIndex = null;

    // IIFE для Логіки 1: Підсвічування всіх карток
    const HighlightMode1 = (function () {
      function highlight(selectedCardIndex, dobbleDeck, category) {
        const selectedCardSymbols = dobbleDeck[selectedCardIndex];
        const allDeckCards = [
          ...StateModule.getDOMCache().initialDeckDisplay.querySelectorAll(
            ".deck-card"
          ),
          ...StateModule.getDOMCache().usedDeckDisplay.querySelectorAll(
            ".deck-card"
          ),
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

        const isInitialDeck =
          StateModule.getDOMCache().initialDeckDisplay.querySelector(
            `.deck-card[data-index="${selectedCardIndex}"]`
          );
        if (isInitialDeck) {
          const initialDeckCards = document.querySelectorAll(
            "#initialDeckDisplay .deck-card"
          );
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
          const usedDeckCards = document.querySelectorAll(
            "#usedDeckDisplay .deck-card"
          );
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

      // Зберігаємо стан підсвічування перед оновленням
      const highlightedSymbolsInitial = new Map();
      const highlightedSymbolsUsed = new Map();
      if (document.getElementById("highlightCheckbox").checked) {
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

      // Очищаємо initialDeckDisplay
      initialDeckDisplay.innerHTML = "";

      // Створюємо масив для впорядкованого відображення карток
      const inGameCards = [];
      const otherCards = [];

      // Розподіляємо картки на in-game та інші
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
            inGameCards.push(card);
          } else {
            otherCards.push(card);
          }
        }
      });

      // Додаємо спочатку in-game картки, потім решту
      [...inGameCards, ...otherCards].forEach((card) => {
        initialDeckDisplay.appendChild(card);
      });

      // Відображаємо картки в usedDeckDisplay у порядку додавання
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

      // Відновлюємо підсвічування
      if (document.getElementById("highlightCheckbox").checked) {
        const mode = document.getElementById("highlightMode1").checked
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
      return symbolDiv;
    }

    function getSymbolValue(symbolElement, category) {
      if (category === "numbers")
        return parseInt(symbolElement.textContent.trim());
      if (category === "images")
        return symbolElement.querySelector("img")?.src.split("/").pop();
      return symbolElement.textContent.trim();
    }

    function moveCardToUsedDeck(cardIndex) {
      const initialCards =
        StateModule.getDOMCache().initialDeckDisplay.querySelectorAll(
          ".deck-card"
        );
      const cardToMove = Array.from(initialCards).find(
        (card) => parseInt(card.dataset.index) === cardIndex
      );
      if (cardToMove) {
        console.log(
          `Переміщення картки з індексом ${cardIndex} до usedDeckDisplay`
        );
        StateModule.getDOMCache().initialDeckDisplay.removeChild(cardToMove);
        cardToMove.classList.remove("in-game");
        cardToMove.classList.add("used-card");

        const highlightMode = document.getElementById("highlightMode1").checked
          ? "mode1"
          : "mode2";
        if (document.getElementById("highlightCheckbox").checked) {
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
      if (!document.getElementById("highlightCheckbox").checked) {
        clearDeckHighlighting();
        return;
      }

      const highlightMode = document.getElementById("highlightMode1").checked
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
      const allInitialCards =
        StateModule.getDOMCache().initialDeckDisplay.querySelectorAll(
          ".deck-card"
        );
      allInitialCards.forEach((card) => {
        const cardIndex = parseInt(card.dataset.index);
        if (cardIndex === leftIdx || cardIndex === rightIdx) {
          card.classList.add("in-game");
        } else {
          card.classList.remove("in-game");
        }
      });
    }

    document
      .getElementById("showDeckCheckbox")
      .addEventListener("change", function () {
        const isChecked = this.checked;
        document.getElementById("highlightCheckboxLabel").style.display =
          isChecked ? "block" : "none";
        if (!isChecked) {
          document.getElementById("highlightCheckbox").checked = false;
          document.getElementById("highlightOptions").style.display = "none";
          clearDeckHighlighting();
          lastHighlightedInitialCardIndex = null;
          lastHighlightedUsedCardIndex = null;
        }
      });

    document
      .getElementById("highlightCheckbox")
      .addEventListener("change", function () {
        const isChecked = this.checked;
        document.getElementById("highlightOptions").style.display =
          isChecked && MainModalModule.getShowDeck() ? "block" : "none";
        if (!isChecked) {
          clearDeckHighlighting();
          lastHighlightedInitialCardIndex = null;
          lastHighlightedUsedCardIndex = null;
        }
      });

    StateModule.getDOMCache().initialDeckDisplay.addEventListener(
      "click",
      (event) => {
        const deckCard = event.target.closest(".deck-card");
        if (deckCard && !deckCard.classList.contains("used-card")) {
          const selectedCardIndex = parseInt(deckCard.dataset.index);
          console.log(
            `Клікнуто картку з індексом ${selectedCardIndex} у початковій колоді`
          );

          if (!document.getElementById("highlightCheckbox").checked) return;

          const mode = document.getElementById("highlightMode1").checked
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
            if (mode === "mode2") clearDeckHighlighting("#initialDeckDisplay");
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
      }
    );

    StateModule.getDOMCache().usedDeckDisplay.addEventListener(
      "click",
      (event) => {
        const deckCard = event.target.closest(".deck-card");
        if (deckCard && deckCard.classList.contains("used-card")) {
          const selectedCardIndex = parseInt(deckCard.dataset.index);
          console.log(
            `Клікнуто картку з індексом ${selectedCardIndex} у використаній колоді`
          );

          if (!document.getElementById("highlightCheckbox").checked) return;

          const mode = document.getElementById("highlightMode1").checked
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
      }
    );

    document.getElementById("highlightMode1").addEventListener("change", () => {
      if (!document.getElementById("highlightCheckbox").checked) return;
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

    document.getElementById("highlightMode2").addEventListener("change", () => {
      if (!document.getElementById("highlightCheckbox").checked) return;
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

    document
      .getElementById("showInitialDeckCheckbox")
      .addEventListener("change", function () {
        StateModule.getDOMCache().initialDeckDisplay.style.display = this
          .checked
          ? "flex"
          : "none";
      });

    document
      .getElementById("showUsedDeckCheckbox")
      .addEventListener("change", function () {
        StateModule.getDOMCache().usedDeckDisplay.style.display = this.checked
          ? "flex"
          : "none";
      });

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
    let countdownInterval = null;

    // Спільна функція для показу підказки
    function showHint() {
      const leftCard = document.querySelector('.card[data-position="left"]');
      const rightCard = document.querySelector('.card[data-position="right"]');
      if (!leftCard || !rightCard) {
        console.error("Ліва або права картка не знайдена");
        return;
      }

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

    // Спільна функція для приховування підказки
    function hideHint() {
      StateModule.getDOMCache().hintDisplay.style.display = "none";
      isHintVisible = false;
      if (hintTimeout) {
        clearTimeout(hintTimeout);
        hintTimeout = null;
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }

    // Спільна функція для позиціонування підказки
    function positionHint() {
      const buttonRect = document
        .getElementById("showHintButton")
        .getBoundingClientRect();
      const gameContainerRect =
        StateModule.getDOMCache().gameContainer.getBoundingClientRect();

      const leftPosition = buttonRect.right - gameContainerRect.left + 15;
      const hintHeight = StateModule.getDOMCache().hintDisplay.offsetHeight;
      const buttonHeight = buttonRect.height;
      const topPosition =
        buttonRect.top -
        gameContainerRect.top +
        (buttonHeight - hintHeight) / 2;

      StateModule.getDOMCache().hintDisplay.style.left = `${leftPosition}px`;
      StateModule.getDOMCache().hintDisplay.style.top = `${topPosition}px`;
    }

    // Новий метод для скидання стану підказки
    function resetHintState() {
      hideHint();
      isAutoHintActive = false;
      resetTimerLabel();
    }

    // Функція для оновлення тексту зворотного відліку
    function updateTimerLabel(remainingTime) {
      const input = document.querySelector("input#manualHintRadio");
      if (!input) {
        console.error("Елемент input#manualHintRadio не знайдено");
        return;
      }
      const label = input.parentElement;
      if (!label) {
        console.error("Батьківський елемент <label> не знайдено");
        return;
      }
      let countdownSpan = label.querySelector(".countdown");
      if (!countdownSpan) {
        // Створюємо <span> для зворотного відліку, якщо його ще немає
        countdownSpan = document.createElement("span");
        countdownSpan.classList.add("countdown");
        countdownSpan.textContent = "(2 сек.)";
        label.appendChild(countdownSpan);
      }
      countdownSpan.textContent = `(${(remainingTime / 1000).toFixed(1)} сек.)`;
      console.log(
        "Оновлено текст зворотного відліку:",
        countdownSpan.textContent
      );
    }

    // Функція для скидання тексту зворотного відліку
    function resetTimerLabel() {
      const input = document.querySelector("input#manualHintRadio");
      if (!input) {
        console.error("Елемент input#manualHintRadio не знайдено");
        return;
      }
      const label = input.parentElement;
      if (!label) {
        console.error("Батьківський елемент <label> не знайдено");
        return;
      }
      let countdownSpan = label.querySelector(".countdown");
      if (!countdownSpan) {
        // Створюємо <span> для зворотного відліку, якщо його ще немає
        countdownSpan = document.createElement("span");
        countdownSpan.classList.add("countdown");
        countdownSpan.textContent = "(2 сек.)";
        label.appendChild(countdownSpan);
        console.log("Створено елемент .countdown");
      }
      countdownSpan.textContent = "(2 сек.)";
      countdownSpan.classList.remove("blinking");
      console.log("Скинуто текст зворотного відліку");
    }

    // IIFE для логіки "Постійна підказка"
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

    // IIFE для логіки "Ручна підказка (2 сек.)"
    const ManualHintLogic = (function () {
      function showTemporary() {
        console.log("Запуск ManualHintLogic.showTemporary");
        if (countdownInterval) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }

        if (!isHintVisible) {
          showHint();
        }
        let remainingTime = 2000;
        const input = document.querySelector("input#manualHintRadio");
        if (!input) {
          console.error("Елемент input#manualHintRadio не знайдено");
          return;
        }
        const label = input.parentElement;
        if (!label) {
          console.error("Батьківський елемент <label> не знайдено");
          return;
        }
        // Перевіряємо або створюємо span для зворотного відліку
        let countdownSpan = label.querySelector(".countdown");
        if (!countdownSpan) {
          countdownSpan = document.createElement("span");
          countdownSpan.classList.add("countdown");
          countdownSpan.textContent = "(2 сек.)";
          label.appendChild(countdownSpan);
        }
        countdownSpan.classList.add("blinking");
        console.log("Додано клас .blinking до countdownSpan");

        // Встановлюємо початковий текст "Ручна підказка"
        label.childNodes.forEach((node) => {
          if (
            node.nodeType === Node.TEXT_NODE &&
            node.textContent.includes("Ручна підказка")
          ) {
            node.textContent = "Ручна підказка ";
          }
        });

        updateTimerLabel(remainingTime);

        countdownInterval = setInterval(() => {
          remainingTime -= 100;
          console.log("Залишилось часу:", remainingTime / 1000);
          if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            hideHint();
            resetTimerLabel();
            console.log("Таймер завершено, підказку приховано");
          } else {
            updateTimerLabel(remainingTime);
          }
        }, 100);
      }

      return {
        showTemporary,
      };
    })();

    // Функція для перемикання логіки підказок
    function toggleHint() {
      console.log(
        "Викликано toggleHint, manualHintRadio checked:",
        document.getElementById("manualHintRadio").checked
      );
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

    // Оновлений обробник події resize для оновлення позиції підказки
    function handleWindowResize() {
      if (isHintVisible) {
        positionHint();
      }
    }

    // Ініціалізація обробника resize при завантаженні модуля
    window.addEventListener("resize", handleWindowResize);

    // Обробники подій для радіокнопок
    document
      .getElementById("manualHintRadio")
      .addEventListener("change", function () {
        if (this.checked) {
          AutoHintLogic.disable();
          resetTimerLabel();
        }
      });

    document
      .getElementById("autoHintRadio")
      .addEventListener("change", function () {
        if (this.checked && !AutoHintLogic.getIsActive()) {
          // Активуємо лише при явному натисканні на кнопку "Показати підказку"
          resetTimerLabel();
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

    // Спільна функція для очищення всіх підсвічувань
    function clearAllHighlights() {
      const leftCard = document.querySelector('.card[data-position="left"]');
      const rightCard = document.querySelector('.card[data-position="right"]');
      if (leftCard && rightCard) {
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
    }

    // Спільна функція для очищення підсвічування конкретного символу
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

    // IIFE для логіки "Миготіння"
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
        if (!leftCard || !rightCard) return;

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

    // IIFE для логіки "Одноразового підсвічування"
    const SingleHighlightLogic = (function () {
      function highlight() {
        const leftCard = document.querySelector('.card[data-position="left"]');
        const rightCard = document.querySelector(
          '.card[data-position="right"]'
        );
        if (!leftCard || !rightCard) return;

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

    // Публічні методи модуля
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

  // Модуль "Зупинити пульсацію" через IIFE
  const StopPulsationModule = (function () {
    let isPulsationStopped = false;
    let pulsationTimeout = null;
    let countdownInterval = null;

    function stopPulsation() {
      const pulsatingElements = document.querySelectorAll(
        ".number-text.pulsating"
      );
      console.log("Знайдено пульсуючих елементів:", pulsatingElements.length);
      pulsatingElements.forEach((symbol) => {
        console.log("Поточні класи перед зупинкою:", symbol.className);
        symbol.classList.remove("pulsating");
        console.log("Класи після зупинки:", symbol.className);
        console.log("Стилі анімації після зупинки:", symbol.style.animation);
      });
      isPulsationStopped = true;
      console.log("Пульсація зупинена");
    }

    function restorePulsation() {
      console.log(
        "Початок відновлення пульсації, isPulsationStopped:",
        isPulsationStopped
      );
      if (
        MainModalModule.getCategory() === "numbers" &&
        MainModalModule.getDifficulty() === "medium_modified" &&
        MainModalModule.getModification() === "pulsation"
      ) {
        const leftCard = document.querySelector('.card[data-position="left"]');
        const rightCard = document.querySelector(
          '.card[data-position="right"]'
        );
        if (leftCard && rightCard) {
          console.log("Відновлення пульсації для лівої та правої карток");
          DifficultyModule.NumbersLogic.PulsationMediumModifiedLevelNumbersLogic.apply(
            leftCard,
            rightCard
          );
          const pulsatingElements = document.querySelectorAll(
            ".number-text.pulsating"
          );
          console.log(
            "Елементи з пульсацією після apply:",
            pulsatingElements.length
          );
          pulsatingElements.forEach((symbol) => {
            console.log("Класи після відновлення:", symbol.className);
            console.log(
              "Стилі анімації після відновлення:",
              symbol.style.animation
            );
          });
        } else {
          console.error("Ліва або права картка не знайдена");
        }
      } else {
        console.error("Умови для відновлення пульсації не виконані:", {
          category: MainModalModule.getCategory(),
          difficulty: MainModalModule.getDifficulty(),
          modification: MainModalModule.getModification(),
        });
      }
      isPulsationStopped = false;
      if (pulsationTimeout) {
        clearTimeout(pulsationTimeout);
        pulsationTimeout = null;
      }
      console.log("Пульсація відновлена");
    }

    function updateTimerLabel(remainingTime) {
      const input = document.querySelector("input#temporaryStopPulsationRadio");
      if (!input) {
        console.error("Елемент input#temporaryStopPulsationRadio не знайдено");
        return;
      }
      const label = input.parentElement;
      if (!label) {
        console.error("Батьківський елемент <label> не знайдено");
        return;
      }
      let countdownSpan = label.querySelector(".countdown");
      if (!countdownSpan) {
        countdownSpan = document.createElement("span");
        countdownSpan.classList.add("countdown");
        countdownSpan.textContent = MainModalModule.getDependOnCardElements()
          ? `(${MainModalModule.getNumberOfSymbols()} сек.)`
          : "(2 сек.)";
        label.appendChild(countdownSpan);
      }
      countdownSpan.textContent = `(${(remainingTime / 1000).toFixed(1)} сек.)`;
      console.log(
        "Оновлено текст зворотного відліку:",
        countdownSpan.textContent
      );
    }

    function resetTimerLabel() {
      const input = document.querySelector("input#temporaryStopPulsationRadio");
      if (!input) {
        console.error("Елемент input#temporaryStopPulsationRadio не знайдено");
        return;
      }
      const label = input.parentElement;
      if (!label) {
        console.error("Батьківський елемент <label> не знайдено");
        return;
      }
      let countdownSpan = label.querySelector(".countdown");
      if (!countdownSpan) {
        countdownSpan = document.createElement("span");
        countdownSpan.classList.add("countdown");
        label.appendChild(countdownSpan);
        console.log("Створено елемент .countdown");
      }
      const duration = MainModalModule.getDependOnCardElements()
        ? MainModalModule.getNumberOfSymbols()
        : 2;
      countdownSpan.textContent = `(${duration} сек.)`;
      countdownSpan.classList.remove("blinking");
      console.log(
        "Скинуто текст зворотного відліку:",
        countdownSpan.textContent
      );
    }

    const PermanentStopPulsationLogic = (function () {
      function stop() {
        stopPulsation();
      }

      function toggle() {
        console.log(
          "PermanentStopPulsationLogic.toggle, isPulsationStopped:",
          isPulsationStopped
        );
        if (isPulsationStopped) {
          restorePulsation();
        } else {
          stopPulsation();
        }
      }

      return { stop, toggle };
    })();

    const TemporaryStopLogic = (function () {
      function stopTemporary() {
        console.log("Запуск TemporaryStopLogic.stopTemporary");
        try {
          if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
          }

          stopPulsation();
          const duration = MainModalModule.getDependOnCardElements()
            ? MainModalModule.getNumberOfSymbols() * 1000
            : 2000;
          let remainingTime = duration;
          const input = document.querySelector(
            "input#temporaryStopPulsationRadio"
          );
          if (!input) {
            console.error(
              "Елемент input#temporaryStopPulsationRadio не знайдено"
            );
            return;
          }
          const label = input.parentElement;
          if (!label) {
            console.error("Батьківський елемент <label> не знайдено");
            return;
          }
          let countdownSpan = label.querySelector(".countdown");
          if (!countdownSpan) {
            countdownSpan = document.createElement("span");
            countdownSpan.classList.add("countdown");
            countdownSpan.textContent =
              MainModalModule.getDependOnCardElements()
                ? `(${MainModalModule.getNumberOfSymbols()} сек.)`
                : "(2 сек.)";
            label.appendChild(countdownSpan);
          }
          countdownSpan.classList.add("blinking");
          console.log("Додано клас .blinking до countdownSpan");

          label.childNodes.forEach((node) => {
            if (
              node.nodeType === Node.TEXT_NODE &&
              node.textContent.includes("Тимчасова зупинка")
            ) {
              node.textContent = "Тимчасова зупинка ";
            }
          });

          updateTimerLabel(remainingTime);

          countdownInterval = setInterval(() => {
            remainingTime -= 100;
            console.log("Залишилось часу:", remainingTime / 1000);
            if (remainingTime <= 0) {
              clearInterval(countdownInterval);
              countdownInterval = null;
              restorePulsation();
              resetTimerLabel();
              console.log("Таймер завершено, пульсацію відновлено");
            } else {
              updateTimerLabel(remainingTime);
            }
          }, 100);
        } catch (error) {
          console.error("Помилка у TemporaryStopLogic.stopTemporary:", error);
        }
      }

      return { stopTemporary };
    })();

    function togglePulsation() {
      console.log(
        "Викликано togglePulsation, temporaryStopPulsationRadio checked:",
        document.getElementById("temporaryStopPulsationRadio").checked
      );
      if (document.getElementById("permanentStopPulsationRadio").checked) {
        PermanentStopPulsationLogic.toggle();
      } else if (
        document.getElementById("temporaryStopPulsationRadio").checked
      ) {
        TemporaryStopLogic.stopTemporary();
      }
    }

    function resetState() {
      console.log("Скидання стану StopPulsationModule");
      if (isPulsationStopped) {
        restorePulsation();
      }
      isPulsationStopped = false;
      if (pulsationTimeout) {
        clearTimeout(pulsationTimeout);
        pulsationTimeout = null;
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      resetTimerLabel();
      const temporaryRadio = document.getElementById(
        "temporaryStopPulsationRadio"
      );
      const permanentRadio = document.getElementById(
        "permanentStopPulsationRadio"
      );
      if (temporaryRadio && permanentRadio) {
        temporaryRadio.checked = true;
        permanentRadio.checked = false;
      }
    }

    return {
      togglePulsation,
      stopPulsation,
      restorePulsation,
      resetTimerLabel,
      resetState,
      get isPulsationStopped() {
        return isPulsationStopped;
      },
    };
  })();

  // Модуль "Зупинити миготіння" через IIFE
  const StopBlinkModule = (function () {
    let isBlinkStopped = false;
    let blinkTimeout = null;
    let countdownInterval = null;

    function stopBlink() {
      const flickeringElements = document.querySelectorAll(
        ".number-text.flickering-slow, .number-text.flickering-medium, .number-text.flickering-fast, .number-text.flickering-asynchronous"
      );
      console.log("Знайдено миготливих елементів:", flickeringElements.length);
      flickeringElements.forEach((symbol) => {
        console.log("Поточні класи перед зупинкою:", symbol.className);
        symbol.classList.remove(
          "flickering-slow",
          "flickering-medium",
          "flickering-fast",
          "flickering-asynchronous"
        );
        symbol.style.animation = "";
        symbol.style.animationDelay = "";
        console.log("Класи після зупинки:", symbol.className);
        console.log("Стилі анімації після зупинки:", symbol.style.animation);
      });
      isBlinkStopped = true;
      console.log("Миготіння зупинено");
    }

    function restoreBlink() {
      console.log(
        "Початок відновлення миготіння, isBlinkStopped:",
        isBlinkStopped
      );
      if (
        MainModalModule.getCategory() === "numbers" &&
        MainModalModule.getDifficulty() === "medium_modified" &&
        MainModalModule.getModification() === "flickering"
      ) {
        const leftCard = document.querySelector('.card[data-position="left"]');
        const rightCard = document.querySelector(
          '.card[data-position="right"]'
        );
        if (leftCard && rightCard) {
          console.log("Відновлення миготіння для лівої та правої карток");
          // Очищення всіх залишкових стилів перед застосуванням
          const numberElements = document.querySelectorAll(".number-text");
          numberElements.forEach((el) => {
            el.style.animation = "";
            el.style.animationDelay = "";
          });
          DifficultyModule.NumbersLogic.FlickeringMediumModifiedLevelNumbersLogic.apply(
            leftCard,
            rightCard
          );
          const flickeringElements = document.querySelectorAll(
            ".number-text.flickering-slow, .number-text.flickering-medium, .number-text.flickering-fast, .number-text.flickering-asynchronous"
          );
          console.log(
            "Елементи з миготінням після apply:",
            flickeringElements.length
          );
          flickeringElements.forEach((symbol) => {
            console.log("Класи після відновлення:", symbol.className);
            console.log(
              "Стилі анімації після відновлення:",
              symbol.style.animation
            );
          });
        } else {
          console.error("Ліва або права картка не знайдена");
        }
      } else {
        console.error("Умови для відновлення миготіння не виконані:", {
          category: MainModalModule.getCategory(),
          difficulty: MainModalModule.getDifficulty(),
          modification: MainModalModule.getModification(),
        });
      }
      isBlinkStopped = false;
      if (blinkTimeout) {
        clearTimeout(blinkTimeout);
        blinkTimeout = null;
      }
      console.log("Миготнення відновлено");
    }

    function updateTimerLabel(remainingTime) {
      const input = document.querySelector("#temporaryStopBlinkRadio");
      if (!input) {
        console.error("Елемент #temporaryStopBlinkRadio не знайдено");
        return;
      }
      const label = input.parentElement;
      if (!label) {
        console.error("Батьківський елемент <label> не знайдено");
        return;
      }
      let countdownSpan = label.querySelector(".countdown");
      if (!countdownSpan) {
        countdownSpan = document.createElement("span");
        countdownSpan.classList.add("countdown");
        countdownSpan.textContent =
          MainModalModule.getDependOnCardElementsBlink()
            ? `(${MainModalModule.getNumberOfSymbols()} сек.)`
            : "(2 сек.)";
        label.appendChild(countdownSpan);
      }
      countdownSpan.textContent = `(${(remainingTime / 1000).toFixed(1)} сек.)`;
      console.log(
        "Оновлено текст зворотного відліку:",
        countdownSpan.textContent
      );
    }

    function resetTimerLabel() {
      const input = document.querySelector("#temporaryStopBlinkRadio");
      if (!input) {
        console.error("Елемент #temporaryStopBlinkRadio не знайдено");
        return;
      }
      const label = input.parentElement;
      if (!label) {
        console.error("Батьківський елемент <label> не знайдено");
        return;
      }
      let countdownSpan = label.querySelector(".countdown");
      if (!countdownSpan) {
        countdownSpan = document.createElement("span");
        countdownSpan.classList.add("countdown");
        label.appendChild(countdownSpan);
        console.log("Створено елемент .countdown");
      }
      const duration = MainModalModule.getDependOnCardElementsBlink()
        ? MainModalModule.getNumberOfSymbols()
        : 2;
      countdownSpan.textContent = `(${duration} сек.)`;
      countdownSpan.classList.remove("blinking");
      console.log(
        "Скинуто текст зворотного відліку:",
        countdownSpan.textContent
      );
    }

    const PermanentStopLogic = (function () {
      function stop() {
        stopBlink();
      }

      function toggle() {
        console.log(
          "PermanentStopLogic.toggle, isBlinkStopped:",
          isBlinkStopped
        );
        if (isBlinkStopped) {
          restoreBlink();
        } else {
          stopBlink();
        }
        updateButtonText();
      }

      return { stop, toggle };
    })();

    const TemporaryStopLogic = (function () {
      function stopTemporary() {
        console.log("Запуск TemporaryStopLogic.stopTemporary");
        if (countdownInterval) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }

        stopBlink();
        const duration = MainModalModule.getDependOnCardElementsBlink()
          ? MainModalModule.getNumberOfSymbols() * 1000
          : 2000;
        let remainingTime = duration;
        const input = document.querySelector("#temporaryStopBlinkRadio");
        if (!input) {
          console.error("Елемент #temporaryStopBlinkRadio не знайдено");
          return;
        }
        const label = input.parentElement;
        if (!label) {
          console.error("Батьківський елемент <label> не знайдено");
          return;
        }
        let countdownSpan = label.querySelector(".countdown");
        if (!countdownSpan) {
          countdownSpan = document.createElement("span");
          countdownSpan.classList.add("countdown");
          countdownSpan.textContent =
            MainModalModule.getDependOnCardElementsBlink()
              ? `(${MainModalModule.getNumberOfSymbols()} сек.)`
              : "(2 сек.)";
          label.appendChild(countdownSpan);
        }
        countdownSpan.classList.add("blinking");
        console.log("Додано клас .blinking");

        label.childNodes.forEach((node) => {
          if (
            node.nodeType === Node.TEXT_NODE &&
            node.textContent.includes("Тимчасова зупинка")
          ) {
            node.textContent = "Тимчасова зупинка ";
          }
        });

        updateTimerLabel(remainingTime);

        countdownInterval = setInterval(() => {
          remainingTime -= 100;
          console.log("Залишилось часу:", remainingTime / 1000);
          if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            restoreBlink();
            resetTimerLabel();
            updateButtonText();
            console.log("Таймер завершено, миготіння відновлено");
          } else {
            updateTimerLabel(remainingTime);
          }
        }, 100);
      }

      return { stopTemporary };
    })();

    function updateButtonText() {
      const stopButton = document.getElementById("stopBlinkButton");
      if (!stopButton) {
        console.error("Елемент stopBlinkButton не знайдено");
        return;
      }
      stopButton.textContent = isBlinkStopped
        ? "Відновити миготіння"
        : "Зупинити миготіння";
      console.log("Оновлено текст кнопки:", stopButton.textContent);
    }

    function toggleBlink() {
      console.log(
        "Викликано toggleBlink, temporaryStopBlinkRadio checked:",
        document.getElementById("temporaryStopBlinkRadio").checked
      );
      if (document.getElementById("permanentStopBlinkRadio").checked) {
        PermanentStopLogic.toggle();
      } else if (document.getElementById("temporaryStopBlinkRadio").checked) {
        TemporaryStopLogic.stopTemporary();
      }
    }

    function resetState() {
      console.log("Скидання стану StopBlinkModule");
      if (isBlinkStopped) {
        restoreBlink();
      }
      isBlinkStopped = false;
      if (blinkTimeout) {
        clearTimeout(blinkTimeout);
        blinkTimeout = null;
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      resetTimerLabel();
      const temporaryRadio = document.getElementById("temporaryStopBlinkRadio");
      const permanentRadio = document.getElementById("permanentStopBlinkRadio");
      if (temporaryRadio && permanentRadio) {
        temporaryRadio.checked = true;
        permanentRadio.checked = false;
        updateButtonText();
      }
    }


    return {
      toggleBlink,
      stopBlink,
      restoreBlink,
      resetTimerLabel,
      resetState,
      get isBlinkStopped() {
        return isBlinkStopped;
      },
    };
  })();

  // Модуль "Зупинити дрижання" через IIFE
  const StopTremblingModule = (function () {
    let isTremblingStopped = false;
    let tremblingTimeout = null;
    let countdownTimer = null;

    function stopTrembling() {
      const tremblingElements = document.querySelectorAll(
        ".number-text.trembling-slow, .number-text.trembling-medium, .number-text.trembling-fast, .number-text.trembling-asynchronous"
      );
      console.log("Знайдено дрижачих елементів:", tremblingElements.length);
      tremblingElements.forEach((element) => {
        console.log("Поточні класи перед зупинкою:", element.className);
        element.classList.remove(
          "trembling-slow",
          "trembling-medium",
          "trembling-fast",
          "trembling-asynchronous"
        );
        element.classList.add("trembling-stopped");
        element.style.animation = "none";
        element.style.transform = "none";
        console.log("Класи після зупинки:", element.className);
        console.log("Стилі анімації після зупинки:", element.style.animation);
      });
      isTremblingStopped = true;
      console.log("Дрижання зупинено");
    }

    function restoreTrembling() {
      console.log(
        "Початок відновлення дрижання, isTremblingStopped:",
        isTremblingStopped
      );
      if (
        MainModalModule.getCategory() === "numbers" &&
        MainModalModule.getDifficulty() === "medium_modified" &&
        MainModalModule.getModification() === "trembling"
      ) {
        const leftCard = document.querySelector('.card[data-position="left"]');
        const rightCard = document.querySelector(
          '.card[data-position="right"]'
        );
        if (leftCard && rightCard) {
          console.log("Відновлення дрижання для лівої та правої карток");
          // Очищення залишкових стилів і класів
          const tremblingElements = document.querySelectorAll(
            ".number-text.trembling-stopped"
          );
          tremblingElements.forEach((element) => {
            element.classList.remove("trembling-stopped");
            element.style.animation = "";
            element.style.transform = "";
            console.log("Видалено trembling-stopped для:", element.className);
          });
          DifficultyModule.NumbersLogic.TremblingMediumModifiedLevelNumbersLogic.apply(
            leftCard,
            rightCard
          );
          const tremblingElementsAfter = document.querySelectorAll(
            ".number-text.trembling-slow, .number-text.trembling-medium, .number-text.trembling-fast, .number-text.trembling-asynchronous"
          );
          console.log(
            "Елементи з дрижанням після apply:",
            tremblingElementsAfter.length
          );
          tremblingElementsAfter.forEach((element) => {
            console.log("Класи після відновлення:", element.className);
            console.log(
              "Стилі анімації після відновлення:",
              element.style.animation
            );
          });
        } else {
          console.error("Ліва або права картка не знайдена");
        }
      } else {
        console.error("Умови для відновлення дрижання не виконані:", {
          category: MainModalModule.getCategory(),
          difficulty: MainModalModule.getDifficulty(),
          modification: MainModalModule.getModification(),
        });
      }
      isTremblingStopped = false;
      if (tremblingTimeout) {
        clearTimeout(tremblingTimeout);
        tremblingTimeout = null;
      }
      console.log("Дрижання відновлено");
    }

    function updateTimerLabel(remainingTime) {
      const input = document.querySelector("input#temporaryStopTremblingRadio");
      if (!input) {
        console.error("Елемент #temporaryStopTremblingRadio не знайдено");
        return;
      }
      const label = input.parentElement;
      if (!label) {
        console.error("Батьківський елемент <label> не знайдено");
        return;
      }
      let countdownSpan = label.querySelector(".countdown");
      if (!countdownSpan) {
        countdownSpan = document.createElement("span");
        countdownSpan.classList.add("countdown");
        countdownSpan.textContent =
          MainModalModule.getDependOnCardElementsTrembling()
            ? `(${MainModalModule.getNumberOfSymbols()} сек.)`
            : "(2 сек.)";
        label.appendChild(countdownSpan);
      }
      countdownSpan.textContent = `(${(remainingTime / 1000).toFixed(1)} сек.)`;
      console.log(
        "Оновлено текст зворотного відліку:",
        countdownSpan.textContent
      );
    }

    function resetTimerLabel() {
      const input = document.querySelector("input#temporaryStopTremblingRadio");
      if (!input) {
        console.error("Елемент #temporaryStopTremblingRadio не знайдено");
        return;
      }
      const label = input.parentElement;
      if (!label) {
        console.error("Батьківський елемент <label> не знайдено");
        return;
      }
      let countdownSpan = label.querySelector(".countdown");
      if (!countdownSpan) {
        countdownSpan = document.createElement("span");
        countdownSpan.classList.add("countdown");
        label.appendChild(countdownSpan);
        console.log("Створено елемент .countdown");
      }
      const duration = MainModalModule.getDependOnCardElementsTrembling()
        ? MainModalModule.getNumberOfSymbols()
        : 2;
      countdownSpan.textContent = `(${duration} сек.)`;
      countdownSpan.classList.remove("blinking");
      console.log(
        "Скинуто текст зворотного відліку:",
        countdownSpan.textContent
      );
    }

    function updateButtonText() {
      const stopButton = document.getElementById("stopTremblingButton");
      if (!stopButton) {
        console.error("Елемент stopTremblingButton не знайдено");
        return;
      }
      stopButton.textContent = isTremblingStopped
        ? "Відновити дрижання"
        : "Зупинити дрижання";
      console.log("Оновлено текст кнопки:", stopButton.textContent);
    }

    const PermanentStopTremblingLogic = (function () {
      function stop() {
        stopTrembling();
        updateButtonText();
      }

      function toggle() {
        console.log(
          "PermanentStopTremblingLogic.toggle, isTremblingStopped:",
          isTremblingStopped
        );
        if (isTremblingStopped) {
          restoreTrembling();
        } else {
          stopTrembling();
        }
        updateButtonText();
      }

      return { stop, toggle };
    })();

    const TemporaryStopTremblingLogic = (function () {
      function stopTemporary() {
        console.log("Запуск TemporaryStopTremblingLogic.stopTemporary");
        if (countdownTimer) {
          clearInterval(countdownTimer);
          countdownTimer = null;
        }

        stopTrembling();
        const duration = MainModalModule.getDependOnCardElementsTrembling()
          ? MainModalModule.getNumberOfSymbols() * 1000
          : 2000;
        let remainingTime = duration;
        const input = document.querySelector(
          "input#temporaryStopTremblingRadio"
        );
        if (!input) {
          console.error("Елемент #temporaryStopTremblingRadio не знайдено");
          return;
        }
        const label = input.parentElement;
        if (!label) {
          console.error("Батьківський елемент <label> не знайдено");
          return;
        }
        let countdownSpan = label.querySelector(".countdown");
        if (!countdownSpan) {
          countdownSpan = document.createElement("span");
          countdownSpan.classList.add("countdown");
          countdownSpan.textContent =
            MainModalModule.getDependOnCardElementsTrembling()
              ? `(${MainModalModule.getNumberOfSymbols()} сек.)`
              : "(2 сек.)";
          label.appendChild(countdownSpan);
        }
        countdownSpan.classList.add("blinking");
        console.log("Додано клас .blinking до countdown");

        label.childNodes.forEach((node) => {
          if (
            node.nodeType === Node.TEXT_NODE &&
            node.textContent.includes("Тимчасова зупинка")
          ) {
            node.textContent = "Тимчасова зупинка ";
          }
        });

        updateTimerLabel(remainingTime);

        countdownTimer = setInterval(() => {
          remainingTime -= 100;
          console.log("Залишилось часу:", remainingTime / 1000);
          if (remainingTime <= 0) {
            clearInterval(countdownTimer);
            countdownTimer = null;
            restoreTrembling();
            resetTimerLabel();
            updateButtonText();
            console.log("Таймер завершено, дрижання відновлено");
          } else {
            updateTimerLabel(remainingTime);
          }
        }, 100);
      }

      return { stopTemporary };
    })();

    function toggleTrembling() {
      const permanentRadio = document.getElementById(
        "permanentStopTremblingRadio"
      );
      const temporaryRadio = document.getElementById(
        "temporaryStopTremblingRadio"
      );
      if (!permanentRadio || !temporaryRadio) {
        console.error("Один із радіо-елементів не знайдено");
        return;
      }
      console.log(
        "Викликано toggleTrembling, temporaryStopTremblingRadio checked:",
        temporaryRadio.checked
      );
      if (permanentRadio.checked) {
        PermanentStopTremblingLogic.toggle();
      } else if (temporaryRadio.checked) {
        TemporaryStopTremblingLogic.stopTemporary();
      }
    }

    function resetState() {
      console.log("Скидання стану StopTremblingModule");
      if (isTremblingStopped) {
        restoreTrembling();
      }
      isTremblingStopped = false;
      if (tremblingTimeout) {
        clearTimeout(tremblingTimeout);
        tremblingTimeout = null;
      }
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
      resetTimerLabel();
      const temporaryRadio = document.getElementById(
        "temporaryStopTremblingRadio"
      );
      const permanentRadio = document.getElementById(
        "permanentStopTremblingRadio"
      );
      if (temporaryRadio && permanentRadio) {
        temporaryRadio.checked = true;
        permanentRadio.checked = false;
        updateButtonText();
      }
    }


    return {
      toggleTrembling,
      stopTrembling,
      restoreTrembling,
      resetTimerLabel,
      resetState,
      get isTremblingStopped() {
        return isTremblingStopped;
      },
    };
  })();

  // Публічний інтерфейс HintsCoreModule
  return {
    DeckModule,
    HintModule,
    HighlightModule,
    StopPulsationModule,
    StopGeneralTimerModule,
    StopPartialTimerModule,
    StopBlinkModule,
    StopTremblingModule,
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
      console.log("Запуск PairTimeLogic.reset");
      stop();
      StateModule.getGameState().pairTimeMs = 0;
      StateModule.getDOMCache().pairTimeTimer.textContent = formatTime(0);
      start();
      // Синхронізуємо стан після перезапуску
      HintsCoreModule.StopPartialTimerModule.syncAfterCardChange();
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
    console.log("Запуск resetPairTimer");
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
    HintsCoreModule.StopGeneralTimerModule.resetState();
    HintsCoreModule.StopPartialTimerModule.resetState();
    StateModule.getGameState().totalTimeMs = 0;
    StateModule.getGameState().pairTimeMs = 0;
    StateModule.getDOMCache().totalTimeTimer.textContent = formatTime(0);
    StateModule.getDOMCache().pairTimeTimer.textContent = formatTime(0);
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
    HintsCoreModule.StopGeneralTimerModule.resetState();
    HintsCoreModule.StopPartialTimerModule.resetState();
    StateModule.getGameState().totalTimeMs = 0;
    StateModule.getGameState().pairTimeMs = 0;
    StateModule.getDOMCache().totalTimeTimer.textContent = formatTime(0);
    StateModule.getDOMCache().pairTimeTimer.textContent = formatTime(0);
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
    TotalTimeLogic,
    PairTimeLogic,
  };
})();

// Ініціалізація гри
document.addEventListener("DOMContentLoaded", function () {
  (function InitializeModalAndSlider() {
    MainModalModule.showModal();

    var initialCategory = document.getElementById("elementCategory").value;
    var initialNumSymbols = 4;
    if (initialCategory === "images") {
      initialNumSymbols = parseInt(
        document.getElementById("numSymbolsImages").value
      );
    } else if (initialCategory === "hieroglyphs") {
      initialNumSymbols = parseInt(
        document.getElementById("numSymbolsHieroglyphs").value
      );
    } else if (initialCategory === "words") {
      initialNumSymbols = parseInt(
        document.getElementById("numSymbolsWords").value
      );
    } else {
      initialNumSymbols = parseInt(
        document.getElementById("numSymbolsNumbers").value
      );
    }
    CardsSliderModule.updateSlider(initialNumSymbols);
  })();

  (function EndGameButtonHandler() {
    document
      .getElementById("endGameButton")
      .addEventListener("click", function () {
        TimerWindowModule.showEndGameModal();
      });
  })();

  (function HighlightButtonHandler() {
    document
      .getElementById("highlightMainCardsButton")
      .addEventListener("click", function () {
        if (document.getElementById("blinkHighlightRadio").checked) {
          HintsCoreModule.HighlightModule.toggleBlinkingHighlight();
        } else {
          HintsCoreModule.HighlightModule.stopBlinkingHighlight();
          HintsCoreModule.HighlightModule.highlightMatchingMainCardSymbols();
        }
      });
  })();

  (function HintButtonHandler() {
    document
      .getElementById("showHintButton")
      .addEventListener("click", function () {
        HintsCoreModule.HintModule.toggleHint();
      });
  })();

  (function StopPulsationButtonHandler() {
    document
      .getElementById("stopPulsationButton")
      .addEventListener("click", function () {
        HintsCoreModule.StopPulsationModule.togglePulsation();
      });
  })();

  (function StopBlinkButtonHandler() {
    document
      .getElementById("stopBlinkButton")
      .addEventListener("click", function () {
        HintsCoreModule.StopBlinkModule.toggleBlink();
      });
  })();

  (function StopTremblingButtonHandler() {
    document
      .getElementById("stopTremblingButton")
      .addEventListener("click", function () {
        HintsCoreModule.StopTremblingModule.toggleTrembling();
      });
  })();

  (function AutoHintRadioHandler() {
    document
      .getElementById("autoHintRadio")
      .addEventListener("change", function () {
        if (this.checked) {
          HintsCoreModule.HintModule.isAutoHintActive = true;
          HintsCoreModule.HintModule.showHint();
        } else {
          HintsCoreModule.HintModule.hideHint();
          HintsCoreModule.HintModule.isAutoHintActive = false;
        }
      });
  })();

  (function BlinkHighlightRadioHandler() {
    document
      .getElementById("blinkHighlightRadio")
      .addEventListener("change", function () {
        if (this.checked && MainModalModule.getShowHighlightButton()) {
          HintsCoreModule.HighlightModule.startBlinkingHighlight();
        } else {
          HintsCoreModule.HighlightModule.stopBlinkingHighlight();
        }
      });
  })();

  (function SingleHighlightRadioHandler() {
    document
      .getElementById("singleHighlightRadio")
      .addEventListener("change", function () {
        if (this.checked) {
          HintsCoreModule.HighlightModule.stopBlinkingHighlight();
        }
      });
  })();

  (function PermanentStopPulsationRadioHandler() {
    document
      .getElementById("permanentStopPulsationRadio")
      .addEventListener("change", function () {
        if (
          this.checked &&
          !HintsCoreModule.StopPulsationModule.isPulsationStopped
        ) {
          HintsCoreModule.StopPulsationModule.stopPulsation();
        }
      });
  })();

  (function TemporaryStopPulsationRadioHandler() {
    document
      .getElementById("temporaryStopPulsationRadio")
      .addEventListener("change", function () {
        if (
          this.checked &&
          HintsCoreModule.StopPulsationModule.isPulsationStopped
        ) {
          HintsCoreModule.StopPulsationModule.restorePulsation();
        }
      });
  })();

  (function PermanentStopBlinkRadioHandler() {
    document
      .getElementById("permanentStopBlinkRadio")
      .addEventListener("change", function () {
        if (this.checked && !HintsCoreModule.StopBlinkModule.isBlinkStopped) {
          HintsCoreModule.StopBlinkModule.stopBlink();
        }
      });
  })();

  (function TemporaryStopBlinkRadioHandler() {
    document
      .getElementById("temporaryStopBlinkRadio")
      .addEventListener("change", function () {
        if (this.checked && HintsCoreModule.StopBlinkModule.isBlinkStopped) {
          HintsCoreModule.StopBlinkModule.restoreBlink();
        }
      });
  })();

  (function PermanentStopTremblingRadioHandler() {
    document
      .getElementById("permanentStopTremblingRadio")
      .addEventListener("change", function () {
        if (
          this.checked &&
          !HintsCoreModule.StopTremblingModule.isTremblingStopped
        ) {
          HintsCoreModule.StopTremblingModule.stopTrembling();
        }
      });
  })();

  (function TemporaryStopTremblingRadioHandler() {
    document
      .getElementById("temporaryStopTremblingRadio")
      .addEventListener("change", function () {
        if (
          this.checked &&
          HintsCoreModule.StopTremblingModule.isTremblingStopped
        ) {
          HintsCoreModule.StopTremblingModule.restoreTrembling();
        }
      });
  })();

  (function StopGeneralTimerButtonHandler() {
    document
      .getElementById("stopGeneralTimerButton")
      .addEventListener("click", function () {
        console.log("Натиснуто кнопку 'Зупинити загальний таймер'");
        HintsCoreModule.StopGeneralTimerModule.toggleGeneralTimer();
      });
  })();

  (function ResetGeneralTimerRadioHandler() {
    document
      .getElementById("resetGeneralTimerRadio")
      .addEventListener("change", function () {
        console.log("Вибрано 'Обнулити загальний час гри'");
        if (
          this.checked &&
          HintsCoreModule.StopGeneralTimerModule.isGeneralTimerPaused
        ) {
          HintsCoreModule.StopGeneralTimerModule.toggleGeneralTimer();
        }
      });
  })();

  (function PauseGeneralTimerRadioHandler() {
    document
      .getElementById("pauseGeneralTimerRadio")
      .addEventListener("change", function () {
        console.log("Вибрано 'Зупинити загальний час гри'");
        if (
          this.checked &&
          !HintsCoreModule.StopGeneralTimerModule.isGeneralTimerPaused
        ) {
          HintsCoreModule.StopGeneralTimerModule.toggleGeneralTimer();
        }
      });
  })();

  (function StopPartialTimerButtonHandler() {
    document
      .getElementById("stopPartialTimerButton")
      .addEventListener("click", function () {
        console.log("Натиснуто кнопку 'Зупинити таймер знаходження пари'");
        HintsCoreModule.StopPartialTimerModule.togglePartialTimer();
      });
  })();

  (function ResetPartialTimerRadioHandler() {
    document
      .getElementById("resetPartialTimerRadio")
      .addEventListener("change", function () {
        console.log("Вибрано 'Обнулити час знаходження пари'");
        if (
          this.checked &&
          HintsCoreModule.StopPartialTimerModule.isPartialTimerPaused
        ) {
          HintsCoreModule.StopPartialTimerModule.togglePartialTimer();
        }
      });
  })();

  (function PausePartialTimerRadioHandler() {
    document
      .getElementById("pausePartialTimerRadio")
      .addEventListener("change", function () {
        console.log("Вибрано 'Зупинити час знаходження пари'");
        if (
          this.checked &&
          !HintsCoreModule.StopPartialTimerModule.isPartialTimerPaused
        ) {
          HintsCoreModule.StopPartialTimerModule.togglePartialTimer();
        }
      });
  })();

  (function TimerCheckboxesHandler() {
    const updateHintControlsDisplay = function () {
      document.getElementById("hintControls").style.display =
        MainModalModule.getShowHighlightButton() ||
        MainModalModule.getShowHintButton() ||
        MainModalModule.getShowStopPulsationButton() ||
        MainModalModule.getShowStopBlinkButton() ||
        MainModalModule.getShowStopTremblingButton() ||
        MainModalModule.getShowStopGeneralTimer() ||
        MainModalModule.getShowStopPartialTimer()
          ? "flex"
          : "none";
      console.log(
        "Оновлено відображення #hintControls:",
        document.getElementById("hintControls").style.display
      );
    };

    document
      .getElementById("showHighlightButtonCheckbox")
      .addEventListener("change", function () {
        console.log("showHighlightButtonCheckbox changed to:", this.checked);
        updateHintControlsDisplay();
      });

    document
      .getElementById("showHintButtonCheckbox")
      .addEventListener("change", function () {
        console.log("showHintButtonCheckbox changed to:", this.checked);
        updateHintControlsDisplay();
      });

    document
      .getElementById("showStopPulsationButtonCheckbox")
      .addEventListener("change", function () {
        console.log(
          "showStopPulsationButtonCheckbox changed to:",
          this.checked
        );
        updateHintControlsDisplay();
      });

    document
      .getElementById("showStopBlinkButtonCheckbox")
      .addEventListener("change", function () {
        console.log("showStopBlinkButtonCheckbox changed to:", this.checked);
        updateHintControlsDisplay();
      });

    document
      .getElementById("showStopTremblingButtonCheckbox")
      .addEventListener("change", function () {
        console.log(
          "showStopTremblingButtonCheckbox changed to:",
          this.checked
        );
        updateHintControlsDisplay();
      });

    document
      .getElementById("showStopGeneralTimerCheckbox")
      .addEventListener("change", function () {
        console.log("showStopGeneralTimerCheckbox changed to:", this.checked);
        updateHintControlsDisplay();
      });

    document
      .getElementById("showStopPartialTimerCheckbox")
      .addEventListener("change", function () {
        console.log("showStopPartialTimerCheckbox changed to:", this.checked);
        updateHintControlsDisplay();
      });
  })();
});
