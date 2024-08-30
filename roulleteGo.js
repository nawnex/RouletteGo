document.addEventListener("DOMContentLoaded", function() {
  // Example of adding messages
  addMessage("Initializing system...", "system-message");
  setTimeout(() => addMessage("System ready."), 1000);
});

function addMessage(text, type = "message") {
  const chatbox = document.getElementById("chatbox");
  const messageElement = document.createElement("div");
  messageElement.className = type;
  messageElement.innerText = text;
  chatbox.appendChild(messageElement);
  chatbox.scrollTop = chatbox.scrollHeight;  // Scroll to the bottom
  }

// progress bar:
function setProgress(progress) {
  const wave = document.querySelector('.wave');
  const waterBar = document.querySelector('.waterBar');
  wave.style.top = `${100 - progress - 3}%`;
  waterBar.style.height = `${progress}%`;
}

async function betComplete() {
  if (tableOpen === false) {
    addMessage("Table is closed", "system-message");
    return
  }
  if (activeBet['playerId_1'] === undefined) {
    addMessage("No active bets", "system-message");
    return
  }
  let balanceRemove = await removeBetBalance()
  if (balance - balanceRemove < 0) {
    addMessage("Insufficient funds to place bet");
    return
  }
  let baseCovered = await simulateResults()
  if (baseCovered === true) {
    waterMultiplier = 1
  }
  tableOpen = false
  balance -= balanceRemove


  let [randomDegree, randResult] = await wheelSpin()
  await setWheelSpin(randomDegree)
  let finalResult = await wheelResult(randResult)

  await timeout(5000)
  let payout = await payoutCalc(finalResult);

  casinoStaff(payout, finalResult, balanceRemove)
  depositingPayment(payout, finalResult, balanceRemove)
}

function casinoStaff(payout, finalResult, balanceRemove) {
  if (balance > 50 && staffMessages[0]) {
    addMessage(staffMessages[0])
    delete staffMessages[0]
  } else if (balance >= 100 && balance < 200 && staffMessages[1]) {
    addMessage(staffMessages[1])
    delete staffMessages[1]
  } else if (balance >= 250 && staffMessages[2]) {
    addMessage(staffMessages[2])
    delete staffMessages[2]
  } else if (balance >= 500 && staffMessages[3]) {
    addMessage(staffMessages[3])
    delete staffMessages[3]
  } else if (balance >= 700 && staffMessages[4]) {
    addMessage(staffMessages[4])
    delete staffMessages[4]
  } else if (balance >= 1000 && staffMessages[7]) {
    addMessage(staffMessages[7])
    delete staffMessages[7]
  }

  if (payout > 0 && finalResult === 0 && staffMessages[5]) {
    addMessage(staffMessages[5])
    delete staffMessages[5]
  }

  if (balanceRemove > 50 && staffMessages[6]) {
    addMessage(staffMessages[6])
    delete staffMessages[6]
  }
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulateResults() {
  let totalBetAmount = 0
  let totalPayout = 0
  let profitable = 0
  let simulationRuns = 1000
  for (let i = 0; i < simulationRuns; i++) {
    let balanceRemove = await removeBetBalance()
    let [randomDegree, randResult] = await wheelSpin()

    let finalResult = await wheelResult(randResult)
    let payout = await payoutCalc(finalResult)

    if (((payout / balanceRemove) * 100) >= 70) {
      profitable += 1
    }
    totalBetAmount += balanceRemove
    totalPayout += payout
  }
  //console.log('profitable', profitable, 'times out of ', simulationRuns)
  //console.log('profit %', `${((totalPayout / totalBetAmount) * 100).toFixed(0)}%`)
  //console.log('activeBet', activeBet['playerId_1'])
  if (profitable > simulationRuns * 0.6) {
    addMessage("Staff member noticed your suspicious bets\nThe multiplier was set to 1")
    return true
  } else {
    return false
  }
}

async function removeBetBalance() {
  let balanceRemove = 0
  for (const key in activeBet['playerId_1']) {
    balanceRemove += activeBet['playerId_1'][key]
  }
  return balanceRemove
}

async function wheelSpin() {
  // Generate a random degree between 360 and 3600 (10 full rotations + random offset)
  const randomDegree = Math.floor(1800 + Math.random() * 3600); // 360 + random 0-9 full rotations

  const wheelResult = Math.floor(Math.random() * 13);

  const rotations = Math.floor(Math.random() * 10) + 7;

  const positionWithinSegment = Math.random();

  const degreesPerSegment = 360 / 13;

  const baseDegree = wheelResult * degreesPerSegment;

  // Final degree calculation: base degree plus an offset for position within the segment, plus full rotations
  const finalDegree = (rotations * 360) + baseDegree + (positionWithinSegment * degreesPerSegment);
  
  return [finalDegree, wheelResult]
}

async function setWheelSpin(randomDegree) {
  const wheel = document.querySelector('.wheel');
  
  // Reset any previous animation
  wheel.style.transition = 'none';
  wheel.style.transform = 'rotate(0deg)';

  // Trigger reflow to ensure the animation is reset
  wheel.offsetWidth;

  // Apply the spin
  wheel.style.transition = 'transform 5s cubic-bezier(0, 0.18, 0.08, 1)';
  wheel.style.transform = `rotate(${randomDegree + 2}deg)`;
}

async function wheelResult(randResult) {
  /*looking for top left result here are the translations for that*/
  const wheelPossibilities = [7, 6, 5, 4, 3, 2, 1, 0, 12, 11, 10, 9, 8]
  let finalResult
  for (let i = 0; i < 13; i++) {
    if (i === randResult) {
      finalResult = wheelPossibilities[randResult]
      break
    }
  }
  return finalResult
}

async function payoutCalc(finalResult) {
  let payout = 0

  for (let i = 0; i < numTableRelation[finalResult].length; i++) {
    if(activeBet['playerId_1'][numTableRelation[finalResult][i]] !== undefined) {
      let  payoutMultiplier
      if (numTableRelation[finalResult][i] < 13) {
        payoutMultiplier = 12
      } else if (numTableRelation[finalResult][i] < 17) {
        payoutMultiplier = 2
      } else if (numTableRelation[finalResult][i] < 20) {
        payoutMultiplier = 3
      } else if (numTableRelation[finalResult][i] < 24) {
        payoutMultiplier = 4
      }
      payout += activeBet['playerId_1'][numTableRelation[finalResult][i]] * payoutMultiplier
    }
  }
  return payout
}

function depositingPayment(payout, finalResult, betAmount) {
  if (payout === 0) {
    addMessage(`Not this time!\nResult was ${finalResult}`)
  } else {
    payout = parseFloat((payout * waterMultiplier).toFixed(0))
    addMessage(`Bet amount: ${betAmount}\n Payout: ${payout}`)
    addMessage(`Congrats on the win!\nResult was ${finalResult}\n That is a ${((payout / betAmount) * 100).toFixed(0)}% return`, "system-message")
  }
  balance += payout
  document.getElementById('balance').innerHTML = balance
  newBetSet = true;
  multiplierChanges = 7;
  multiplierPipe()
  tableOpen = true;
}

function chipSelection(chipChoice) {
  let chip1 = document.getElementById('oneChipSelect');
  let chip5 = document.getElementById('fiveChipSelect');
  let chip10 = document.getElementById('tenChipSelect');
  let chip100 = document.getElementById('hundredChipSelect');
  chip1.style.height = '60%';
  chip5.style.height = '60%';
  chip10.style.height = '60%';
  chip100.style.height = '60%';
  if(chipChoice === 1) {
    chip1.style.height = '80%';
    chipSelected = 1;
  }
  if(chipChoice === 5) {
    chip5.style.height = '80%';
    chipSelected = 5;
  }
  if(chipChoice === 10) {
    chip10.style.height = '80%';
    chipSelected = 10;
  }
  if(chipChoice === 100) {
    chip100.style.height = '80%';
    chipSelected = 100;
  }
}

function placingBet(location) {
  if (tableOpen === false) {
    addMessage("Table is closed", "system-message");
    return
  }
  if (chipSelected === null) {
    return
  }

  const regex = /(?<=_)\d+/;

  const tableId = location.match(regex)[0];
  
  if (chipSelected === 1) {
    chipText = 'oneChip'
  } else if (chipSelected === 5) {
    chipText = 'fiveChip'
  } else if (chipSelected === 10) {
    chipText = 'tenChip'
  } else if (chipSelected === 100) {
    chipText = 'hundredChip'
  }

  if (boardChips[location] === undefined) {
    boardChips[location] = 0;
  } else {
    boardChips[location] += 1;
  }

  const newDiv = document.createElement('div');
  newDiv.className = 'chipHolder';
  newDiv.style.position = 'absolute';
  newDiv.style.transform = `translateY(-${boardChips[location] * 4}px)`

  // Create the span element
  const span = document.createElement('span');
  span.className = `rouletteChips ${chipText}`;
  span.textContent = `${chipSelected}`;

  // Append the span to the div
  newDiv.appendChild(span);

  // Append the new div to the element with id 'location'
  document.getElementById(location).appendChild(newDiv);

  UpdateActiveBet(parseInt(tableId, 10),  'playerId_1')
}

async function tableWipe() {
  if (tableOpen === false) {
    addMessage("Table is closed", "system-message");
    return
  }
  document.querySelector('.rouletteBets').innerHTML = `<div class="rouletteBetTable">
                <div class="betOutline">
                  <div class="betTopGap"></div>
                  <button class="buttonReset maxResolution" onclick="placingBet('tableId_17')"><div id="tableId_17" class="betWhiteOutline betTop">1 to 1</div></button>
                  <button class="buttonReset maxResolution" onclick="placingBet('tableId_18')"><div id="tableId_18" class="betWhiteOutline betTop">2 to 1</div></button>
                  <button class="buttonReset maxResolution" onclick="placingBet('tableId_19')"><div id="tableId_19" class="betWhiteOutline betTop">3 to 1</div></button>
                  <div class="betTopGap"></div>
                </div>
                <div class="betMidGroup">
                  <div class="betOutline betColumnLine betLeftPadding">
                    <div></div>
                    <button class="buttonReset maxResolution" onclick="placingBet('tableId_20')"><div id="tableId_20" class="betWhiteOutline">1st 3</div></button>
                    <button class="buttonReset maxResolution" onclick="placingBet('tableId_21')"><div id="tableId_21" class="betWhiteOutline">2nd 3</div></button>
                    <button class="buttonReset maxResolution" onclick="placingBet('tableId_22')"><div id="tableId_22" class="betWhiteOutline">3rd 3</div></button>
                    <button class="buttonReset maxResolution" onclick="placingBet('tableId_23')"><div id="tableId_23" class="betWhiteOutline">4th 3</div></button>
                    <div></div>
                  </div>
                  <div class="betNumbers">
                    <button class="buttonReset" onclick="placingBet('tableId_1')"><div id="tableId_1" class="betCell red">1</div></button>
                    <button class="buttonReset" onclick="placingBet('tableId_2')"><div id="tableId_2" class="betCell black">2</div></button>
                    <button class="buttonReset" onclick="placingBet('tableId_3')"><div id="tableId_3" class="betCell red">3</div></button>
                    <button class="buttonReset" onclick="placingBet('tableId_4')"><div id="tableId_4" class="betCell black">4</div></button>
                    <button class="buttonReset" onclick="placingBet('tableId_5')"><div id="tableId_5" class="betCell red">5</div></button>
                    <button class="buttonReset" onclick="placingBet('tableId_6')"><div id="tableId_6" class="betCell black">6</div></button>
                    <button class="buttonReset" onclick="placingBet('tableId_7')"><div id="tableId_7" class="betCell red">7</div></button>
                    <button class="buttonReset" onclick="placingBet('tableId_8')"><div id="tableId_8" class="betCell black">8</div></button>
                    <button class="buttonReset" onclick="placingBet('tableId_9')"><div id="tableId_9" class="betCell red">9</div></button>
                    <button class="buttonReset" onclick="placingBet('tableId_10')"><div id="tableId_10" class="betCell black">10</div></button>
                    <button class="buttonReset" onclick="placingBet('tableId_11')"><div id="tableId_11" class="betCell red">11</div></button>
                    <button class="buttonReset" onclick="placingBet('tableId_12')"><div id="tableId_12" class="betCell black">12</div></button>
                  </div>
                  <div class="betOutline betColumnLine betRightPadding">
                    <div></div>
                    <button class="buttonReset maxResolution" onclick="placingBet('tableId_15')"><div id="tableId_15" class="betWhiteOutline">1 - 6</div></button>
                    <button class="buttonReset maxResolution" onclick="placingBet('tableId_16')"><div id="tableId_16" class="betWhiteOutline">7 - 12</div></button>
                    <div></div>
                  </div>
                </div>
                <div class="betOutline">
                  <div class="betTopGap"></div>
                  <button class="buttonReset maxResolution" onclick="placingBet('tableId_14')"><div id="tableId_14" class="betWhiteOutline betBottom"><span class="whiteDiamond"></span><span class="diamondColours redColor"></span></div></button>
                  <button class="buttonReset maxResolution" onclick="placingBet('tableId_0')"><div id="tableId_0" class="betWhiteOutline betBottom">0</div></button>
                  <button class="buttonReset maxResolution" onclick="placingBet('tableId_13')"><div id="tableId_13" class="betWhiteOutline betBottom"><span class="whiteDiamond"></span><span class="diamondColours blackColor"></span></div></button>
                  <div class="betTopGap"></div>
                </div>
              </div>`;
  boardChips = {}
  activeBet = {}
  currentBetAmount = 0
  document.getElementById('activeBet').innerHTML = currentBetAmount
}

function UpdateActiveBet(tableId, playerId) {
  multiplierPipe()

  if (activeBet[playerId] === undefined) {
    activeBet[playerId] = {}
  }

  if (activeBet[playerId][tableId] === undefined) {
    activeBet[playerId][tableId] = 0
  }
  activeBet[playerId][tableId] += chipSelected

  currentBetAmount = currentBetAmount + chipSelected
  document.getElementById('activeBet').innerHTML = currentBetAmount
}

function multiplierPipe() {
  if (newBetSet === true) {
    const multiplierPercentage = Math.floor(Math.random() * 101)+ 1
    waterMultiplier = parseFloat(((0.3 * (multiplierPercentage / 100)) + 1).toFixed(2));
    setProgress(multiplierPercentage)
    newBetSet = false
  } else if (multiplierChanges > 0) {
    let waterAlteration = parseFloat(((Math.floor(Math.random() * 10) - 5) / 100).toFixed(2));
    waterMultiplier = parseFloat((waterMultiplier + waterAlteration).toFixed(3))
    if (waterMultiplier > 1.3) {
      waterMultiplier = 1.3
    } else if (waterMultiplier < 1) {
      waterMultiplier = 1
    }
    setProgress(((waterMultiplier - 1) / 0.3) * 100)
    multiplierChanges -= 1
  }
}

function freeCoins() {
  balance += 50
  document.getElementById('balance').innerHTML = balance
}

//defining balance & table details
setProgress(0); // Sets the water level
let newBetSet = true
let waterMultiplier = 1
let multiplierChanges = 7

let tableOpen = true;
let chipSelected = 1;
let balance = 25;
let currentBetAmount = 0;
let activeBet = {}
let boardChips = {};
let definedBoard = [
  {'num': 0, 'color': 'green'},
  {'num': 1, 'color': 'red'},
  {'num': 2, 'color': 'black'},
  {'num': 3, 'color': 'red'},
  {'num': 4, 'color': 'black'},
  {'num': 5, 'color': 'red'},
  {'num': 6, 'color': 'black'},
  {'num': 7, 'color': 'red'},
  {'num': 8, 'color': 'black'},
  {'num': 9, 'color': 'red'},
  {'num': 10, 'color': 'black'},
  {'num': 11, 'color': 'red'},
  {'num': 12, 'color': 'black'}
]
let numTableRelation = [
  [0],
  [1, 14, 20, 17, 15],
  [2, 13, 20, 18, 15],
  [3, 14, 20, 19, 15],
  [4, 13, 21, 17, 15],
  [5, 14, 21, 18, 15],
  [6, 13, 21, 19, 15],
  [7, 14, 22, 17, 16],
  [8, 13, 22, 18, 16],
  [9, 14, 22, 19, 16],
  [10, 13, 23, 17, 16],
  [11, 14, 23, 18, 16],
  [12, 13, 23, 19, 16],
]

staffMessages = {
  0:"keep an eye on this new player will ya?",
  1:"I'm sure he didn't arrive with 100 credits",
  2:"Ok Sir please play within the rules.\n you have to respect our rules",
  3:"How?!?\n you arrived with 25 credits where did all this come from?",
  4:"Ok I hold my arms high with a white flag!\n you're gonna win soon. I'm going out of business thanks to you",
  5:"great job! you got it correct!\n now where are your magnets you're hiding?",
  6:"I'm sure you can't keep betting this big\n your luck must run out some time soon",
  7:"CONGRATS\nCONGRATS\nYou've beat us at our own game, we give up on you!"
}