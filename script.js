if(localStorage.getItem("loggedIn") !== "true"){

window.location.href = "login.html"

}

const videoElement = document.getElementById("video")
const canvasElement = document.getElementById("canvas")
const canvasCtx = canvasElement.getContext("2d")

const distanceStatus = document.getElementById("distanceStatus")
const startTestBtn = document.getElementById("startTestBtn")

canvasElement.width = 640
canvasElement.height = 480

let camera = null
let stream = null
let systemRunning = false

// =====================
// FaceMesh
// =====================

const faceMesh = new FaceMesh({

locateFile:(file)=>{
return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
}

})

faceMesh.setOptions({

maxNumFaces:1,
refineLandmarks:true,
minDetectionConfidence:0.5,
minTrackingConfidence:0.5

})

// =====================
// blink detection
// =====================

let blinkCount = 0
let eyeClosed = false

function distance(a,b){

return Math.sqrt(
Math.pow(a.x-b.x,2)+
Math.pow(a.y-b.y,2)
)

}

function calculateEAR(landmarks){

const p1 = landmarks[33]
const p2 = landmarks[160]
const p3 = landmarks[158]
const p4 = landmarks[133]
const p5 = landmarks[153]
const p6 = landmarks[144]

const vertical1 = distance(p2,p6)
const vertical2 = distance(p3,p5)
const horizontal = distance(p1,p4)

return (vertical1+vertical2)/(2*horizontal)

}

// =====================
// distance from camera
// =====================

let faceDistance = 0

function calculateFaceDistance(landmarks){

const leftEye = landmarks[33]
const rightEye = landmarks[263]

let dx = leftEye.x - rightEye.x
let dy = leftEye.y - rightEye.y

let pixelDistance = Math.sqrt(dx*dx + dy*dy)

pixelDistance = pixelDistance * videoElement.videoWidth

if(pixelDistance === 0){
return faceDistance
}

const realEyeDistance = 6.3
const focalLength = 700

faceDistance = (realEyeDistance * focalLength) / pixelDistance

return faceDistance

}

// =====================
// FaceMesh Results
// =====================

faceMesh.onResults(results=>{

canvasCtx.clearRect(0,0,canvasElement.width,canvasElement.height)

canvasCtx.drawImage(
results.image,
0,
0,
canvasElement.width,
canvasElement.height
)

if(results.multiFaceLandmarks){

for(const landmarks of results.multiFaceLandmarks){

let ear = calculateEAR(landmarks)
let dist = calculateFaceDistance(landmarks)

const threshold = 0.21

if(ear < threshold){

eyeClosed = true

}else{

if(eyeClosed){

blinkCount++
eyeClosed = false

}

}

canvasCtx.font = "20px Arial"
canvasCtx.fillStyle = "lime"

canvasCtx.fillText("EAR: "+ear.toFixed(3),20,30)
canvasCtx.fillText("Blinks: "+blinkCount,20,60)
canvasCtx.fillText("Distance: "+dist.toFixed(1)+" cm",20,90)


// =====================
// distance check 50 cm
// =====================

if(dist < 45){

distanceStatus.innerText = "คุณอยู่ใกล้เกินไป กรุณาถอยหลัง"
distanceStatus.style.color = "red"
startTestBtn.disabled = true

}

else if(dist > 55){

distanceStatus.innerText = "คุณอยู่ไกลเกินไป กรุณาขยับเข้ามา"
distanceStatus.style.color = "red"
startTestBtn.disabled = true

}

else{

distanceStatus.innerText = "ระยะห่างเหมาะสม ✔"
distanceStatus.style.color = "green"
startTestBtn.disabled = false

}

}

}

})

// =====================
// Start System
// =====================

async function startSystem(){

if(systemRunning) return

systemRunning = true

stream = await navigator.mediaDevices.getUserMedia({video:true})
videoElement.srcObject = stream

camera = new Camera(videoElement,{

onFrame: async ()=>{

if(systemRunning){
await faceMesh.send({image:videoElement})
}

},

width:640,
height:480

})

camera.start()

}

// =====================
// Stop System
// =====================

function stopSystem(){

systemRunning = false

if(camera){
camera.stop()
}

if(stream){

stream.getTracks().forEach(track=>{
track.stop()
})

}

clearInterval(timerInterval)

canvasCtx.clearRect(0,0,canvasElement.width,canvasElement.height)

}

// =====================
// Vision Test
// =====================

const testCanvas = document.getElementById("testCanvas")
const ctx = testCanvas.getContext("2d")

let round = 0
let maxRounds = 10
let size = 120

const directions = [

0,
Math.PI/4,
Math.PI/2,
3*Math.PI/4,
Math.PI,
5*Math.PI/4,
3*Math.PI/2,
7*Math.PI/4

]

let directionIndex = 0

// =====================
// timer
// =====================

let timeLeft = 3
let timerInterval = null

function startTimer(){

clearInterval(timerInterval)

timeLeft = 3
document.getElementById("timer").innerText = "เวลา: "+timeLeft

timerInterval = setInterval(()=>{

timeLeft--

document.getElementById("timer").innerText = "เวลา: "+timeLeft

if(timeLeft <= 0){

clearInterval(timerInterval)

alert("หมดเวลา!")

stopVisionTest()

}

},1000)

}

// =====================
// random direction
// =====================

function randomDirection(){

directionIndex = Math.floor(Math.random()*8)

}

// =====================
// draw C
// =====================

function drawC(){

ctx.clearRect(0,0,testCanvas.width,testCanvas.height)

ctx.save()

ctx.translate(200,200)

ctx.rotate(directions[directionIndex])

ctx.lineWidth = size/5
ctx.strokeStyle = "black"

ctx.beginPath()

ctx.arc(0,0,size,0.25*Math.PI,1.75*Math.PI)

ctx.stroke()

ctx.restore()

}

// =====================
// next round
// =====================

function nextRound(){

if(round >= maxRounds){

stopVisionTest()
return

}

randomDirection()

drawC()

startTimer()

}

// =====================
// start vision test
// =====================

function startVisionTest(){

round = 0
size = 120

nextRound()

}

// =====================
// vision calculation
// =====================

function calculateVision(score){

if(score <= 1) return "20/200"
if(score == 2) return "20/100"
if(score == 3) return "20/70"
if(score == 4) return "20/50"
if(score == 5) return "20/40"
if(score == 6) return "20/30"
if(score == 7) return "20/25"
if(score >= 8) return "20/20"

}

// =====================
// stop test
// =====================

function stopVisionTest(){

clearInterval(timerInterval)

ctx.clearRect(0,0,testCanvas.width,testCanvas.height)

let vision = calculateVision(round)

alert(
"คะแนน: "+round+
"\nระดับสายตา: "+vision+
"\nระยะห่าง: "+faceDistance.toFixed(1)+" ซม."

)

round = 0
size = 120

}

// =====================
// answer
// =====================

function answer(userDirection){

clearInterval(timerInterval)

if(userDirection === directionIndex){

round++
size = size * 0.8

nextRound()

}else{

stopVisionTest()

}

}