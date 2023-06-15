// PARAMETERS:

let counter = 0; // for controlling rate at which neurons receive input, (every 20 counts)
let scalarInputs = []; // vector for inputs to neurons
let neurons = []; // vector for neurons

// learning rule parameters
let learningRate = 0.05;
const k = 0.1;

// variables specifically for visual inputs
const IMGRESIZEWIDTH = 30;
const IMGRESIZEHEIGHT = 21;
const TOTALPIXELS = IMGRESIZEWIDTH * IMGRESIZEHEIGHT;
let capture; // global variable for getting input from camera
let c, heatMap; // global variable for resized image and heatmap to overlay it with

const RADIUS = 15; // radius of neurons
let inputSize = 4;  // original input size
let inputSizeInput; // UI variable for controlling how many inputs (does not matter in visual input case)
let maxOutput = 0; // variable for holding the maximum output of the neuron system at a particular iteration
let maxWeight = 0; // variable for holding the maximum weight a neuron has at a particular iteration
let inputType, showWeights, showNeurons, learningRule; // user interface for choosing the input scheme, weghter to show connections and neurons
let colorLow, colorHigh; // for assigning outputs


function setup() {
  createCanvas(800, 800);
  strokeWeight(0.1)

  colorLow = color("blue");
  colorHigh = color("orange");

  inputType = createSelect();
  inputType.position(5, height + 15);
  inputType.option("Random Pattern Input");
  inputType.option("Random Noise Input");
  inputType.option("Visual Input");
  inputType.changed(updateChanges);

  learningRule = createSelect();
  learningRule.position(200, height + 15);
  learningRule.option("Oja's Rule");
  learningRule.option("BCM Rule");
  learningRule.changed(updateChanges);

  inputSizeInput = createInput(inputSize);
  inputSizeInput.position(310, height+12);
  inputSizeInput.input(updateChanges);

  showNeurons = createCheckbox('Show Neurons', true);
  showNeurons.position(3* width/4 - 100, height+15);

  showWeights = createCheckbox('Show Weights', true);
  showWeights.position(3* width/4+40, height+15);

  updateChanges();

}

function draw() {
  background(0);
  let outputscalePos = width/2;
  if (inputType.value() === "Visual Input") {
    outputscalePos = 3 * width / 4 + 20;
  }
  fill(255);
  text('output level', outputscalePos-30, height - 85);
  text('0', outputscalePos - 100, height - 35);
  text((Math.round(maxOutput * 100)/100).toString(), outputscalePos + 100, height-35);
  noStroke();
  for (let i = 0; i < 200; i++) {
		fill(lerpColor(colorLow, colorHigh, i/200)); 
		rect(outputscalePos - 100 + i, height-80, 1, 30);
	}

  // to slow down the stime scale along which weare looking at
  counter = counter + 1;
  if (counter === 20) {
    counter = 0;
  }

  if (inputType.value() === "Visual Input") {
    c = capture.get(0,0, capture.width, capture.height);
    c.resize(IMGRESIZEWIDTH, IMGRESIZEHEIGHT);
    image(c, width - c.width * 5, 0, c.width*5, c.height*5, 0,0);
    image(c, width - c.width * 5, c.height*5, c.width*5, c.height*5, 0,0);
    heatMap.updatePixels();
    image(heatMap, width - c.width * 5, c.height*5, c.width*5, c.height*5, 0,0);

    // now assign each scalar input to the value of the pixel of the image
    for (let i=0; i<scalarInputs.length; i++){
      let currPixel = c.get(scalarInputs[i].pixelAddress.x, scalarInputs[i].pixelAddress.y);
      scalarInputs[i].output = (red(currPixel) + green(currPixel) + blue(currPixel))/(255*3);
    }
  }
  if (scalarInputs.length) {
    maxWeight = 0;
    for (const n of neurons){
      n.update();
    }
    for (const s of scalarInputs){
      s.update();
    }
    for (const n of neurons){
      n.drawConnection();
    }
    for (const n of neurons){
      n.draw();
    }
    for (const s of scalarInputs){
      s.draw();
    }
  }
}

function updateChanges(){
  let weights = [];
  scalarInputs = [];
  maxOutput = 0;
  threshold = 0.15;

  if (learningRule.value() === "Oja's Rule") {
    learningRate = 0.05;
  } else {
    learningRate = 0.25;
  }
  if (inputType.value() === "Random Pattern Input" || inputType.value() === "Random Noise Input") {
    for (let i=0; i < inputSizeInput.value(); i++) {
      scalarInputs.push(new ScalarInput(40, ((i+0.5) * ((height - (2 * RADIUS)) / inputSizeInput.value())), random()));
      weights.push(random() / inputSizeInput.value());
    }
    neurons = [];
    lastLayer = scalarInputs;
    let newlastLayerUpdate;
    let layerSize = inputSizeInput.value();
    let newWeights;

      newlastLayerUpdate = [];
      newWeights = [];
      layerSize = constrain(layerSize-1, 1, 100);
  
        for (let k=0; k < layerSize; k++){
          let n = new Neuron(width/4, k * height/layerSize, lastLayer, weights, false);
          neurons.push(n);
          newlastLayerUpdate.push(n);
          newWeights.push(random()/inputSizeInput.value());
        }
      lastLayer = newlastLayerUpdate; 
      weights = newWeights;


  } else if (inputType.value() === "Visual Input") { // input type is visual
    capture = createCapture(VIDEO);
    console.log("Entering Visual Input Mode");
    capture.hide();
    c = capture.get(0,0, capture.width, capture.height);
    c.resize(IMGRESIZEWIDTH, IMGRESIZEHEIGHT);


    neurons = [];
    let weights = [];
    let lastLayer = [];
    scalarInputs = [];
    heatMap = createGraphics(IMGRESIZEWIDTH, IMGRESIZEHEIGHT);

    for (let i=0; i < TOTALPIXELS; i++){
      let s = new ScalarInput(40, (i+0.5) * ((height + (2*RADIUS)) / TOTALPIXELS), 0); // x, y, output
      scalarInputs.push(s);
      weights.push(random() / 9);
      lastLayer.push(s);

      if (i % 9 == 0 || i === TOTALPIXELS-1){ // to fix the last couple of pixels not being given a neuron to connect with
        neurons.push(new Neuron(width / 4, i * height / TOTALPIXELS, lastLayer, weights, false));
        weights = [];
        lastLayer = [];
      }
    }

    // create the last neuron on the end
    let neuronsCopy = neurons;
    let endWeights = Array.from({length: neurons.length}, () => Math.random());
    let endNeuron = new Neuron(3*width / 4, height / 2, neuronsCopy, endWeights, true);
    neurons.push(endNeuron);

    // now assign each scalar input to the value of the pixel of the image
    let counterScale = 0; // for determining where in the scalar input array we are
    for (let x=0; x < IMGRESIZEWIDTH; x += 3){
      for (let y=0; y < IMGRESIZEHEIGHT; y += 3){
        for (let xoffset = 0; xoffset < 3; xoffset++){
          for (let yoffset = 0; yoffset < 3; yoffset++){
            scalarInputs[counterScale].pixelAddress = createVector(x + xoffset, y + yoffset);
            counterScale++;
          }
        }
      }
    }
  }
}



class Neuron {
  constructor(x,y, inputNeighbors, inputWeights, lastNeuro){
    this.position = createVector(x,y);
    this.positionDestination = createVector(x,y);
    this.inputWeights = inputWeights;
    this.inputNeighbors = inputNeighbors;
    this.output = 0;
    this.radius = RADIUS;
    this.velocity = createVector(0, 0);
    this.force = createVector(0, 0);
    this.next = createVector(0,0);
    this.threshold = 0.1;
    this.lastNeuro = lastNeuro; // if this neuron is at the end or not
  }

  update(){
    if (counter === 0) {
      this.output = 0;
      if (learningRule.value() === "Oja's Rule") {
        learningRate = 0.05
        for (let i=0; i<this.inputWeights.length; i++){
          this.output += this.inputWeights[i] * this.inputNeighbors[i].output;
        }
        if (this.output === NaN) {
          this.output = 0;
        }
        this.ojasUpdate();
      } else if (learningRule.value() === "BCM Rule") { // OUTPUT OS NAN FIRST
        let inputSum = 0;
        learningRate = 0.25;
        for (const n of this.inputNeighbors){
          //print(n.output);
          inputSum += n.output;
        } 
        for (let i=0; i<this.inputWeights.length; i++){
          this.output += this.inputWeights[i] * (this.inputNeighbors[i].output / inputSum);
        }
        //print(this.output);
        this.BCMupdate();
        this.thresholdUpdate();
      }

      if (this.output > maxOutput && !this.lastNeuro) {
        maxOutput = this.output;
      }
    }


    // Create a "Destination position" that includes all the weighted sums in the y direction (don't think I need x-direction yet)"
    let totalWeight = 0;
    for (const w of this.inputWeights) {
      totalWeight += w;
      if (w > maxWeight){
        maxWeight = w;
      }
    }
    this.positionDestination.y = 0;
    this.positionDestination.x = this.inputNeighbors[0].position.x + map(constrain(totalWeight,0,this.inputNeighbors.length), 0, this.inputNeighbors.length, width/2, width / 5);
    for (let i=0; i<this.inputWeights.length; i++) {
      this.positionDestination.y += this.inputNeighbors[i].position.y * this.inputWeights[i] / totalWeight;
    }

    if (!this.lastNeuro){
      this.position.y = lerp(this.position.y, this.positionDestination.y, 0.1);
      this.position.x =  lerp(this.position.x, this.positionDestination.x, 0.1);
    } else {
      this.position.x =  3 * width /4;
      this.position.y = height / 2;
    }
    
  }

  draw(){
    fill(lerpColor(colorLow, colorHigh, map(this.output, 0, maxOutput, 0, 1)));
    strokeWeight(0.1);
    if (showNeurons.checked()){
      circle(this.position.x, this.position.y, this.radius*2);
    }
    if (inputType.value() === "Visual Input" && !this.lastNeuro) {
      heatMap.loadPixels();
      for (let n=0; n<this.inputNeighbors.length; n++) {
        let currNeighbor = this.inputNeighbors[n]
        let heatCol = lerpColor(color("green"), color("red"), map(this.inputWeights[n], 0, maxWeight, 0,1));
        heatCol.setAlpha(130);
        heatMap.set(currNeighbor.pixelAddress.x, currNeighbor.pixelAddress.y, heatCol);
      }
      heatMap.updatePixels();  
    }
    if (this.lastNeuro){
      fill(255);
      text("output:", this.position.x+20, this.position.y+5)
      text((Math.round(this.output * 100)/100).toString(), this.position.x+30, this.position.y+18);
    }
    this.position = this.next;
  }

  drawConnection(){
    if (showWeights.checked() && neurons.length) {
      stroke(255);
      for (let i=0; i<this.inputWeights.length; i++){
        strokeWeight(map(this.inputWeights[i], 0, 1, 0, 10));
        line(this.position.x, this.position.y, this.inputNeighbors[i].position.x, this.inputNeighbors[i].position.y);
      }
    }
  }

  ojasUpdate(){ // update function for the weights of Oja's rule
    let layerScale = 1;
    if (this.lastNeuro){
      layerScale = 1 / (neurons.length - 1);
    } 
    for (let i = 0; i<this.inputWeights.length; i++) {
      let inputI = this.inputNeighbors[i].output;
      let penalization = layerScale * learningRate * (this.output ** 2) * this.inputWeights[i];
      let hebbian = layerScale * learningRate * this.output * this.inputNeighbors[i].output;
      this.inputWeights[i] = constrain(this.inputWeights[i] + hebbian - penalization, 0.01, 1);
    }
  }

  BCMupdate(){ // update function for the weights of the BCM Rule
    let inputSum = 0;
    for (const n of this.inputNeighbors){
      inputSum += n.output;
    } 
    if (inputSum == NaN) {
      inputSum = 0;
    }
    
    for (let i = 0; i<this.inputWeights.length; i++) {
      //print(this.inputWeights[i]);
      let inputI = this.inputNeighbors[i].output / inputSum;
      if (inputI == NaN) {
        inputI = 0;
      }
      this.inputWeights[i] = constrain(this.inputWeights[i] + learningRate * (this.output * inputI * (this.output - this.threshold)), 0.01, 1);
    }
  }

  thresholdUpdate(){ // update function for the threshold of the BCM rule
    this.threshold = this.threshold + (1.7 * learningRate * ((this.output ** 2) - this.threshold));
  }

}


class ScalarInput {
  constructor(x,y,output){
    this.position = createVector(x,y);
    this.output = output;
    this.radius = RADIUS;
    this.pixelAddress = createVector(0,0);
  }

  update(){
    if (inputType.value() === "Random Noise Input") {
      this.output = random();
    }
    if (this.output > maxOutput) {
      maxOutput = this.output;
    }
  }

  draw(){
    stroke(255);
    strokeWeight(0.1);
    if (showNeurons.checked()) {
      fill(lerpColor(colorLow, colorHigh, map(this.output, 0, maxOutput, 0, 1)));
      circle(this.position.x, this.position.y, this.radius*2);
    }
  }
}
