const videoElement = document.getElementById("video")
const canvasElement = document.getElementById("canvas")
const canvasCtx = canvasElement.getContext("2d")

const distanceStatus = document.getElementById("distanceStatus")
const countdownText = document.getElementById("countdown")

let camera = null
let stream = null
let systemRunning = false

let lockTimer = null
let distanceLocked = false
let countdownStarted = false

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

function distance(a,b){
return Math.sqrt(
Math.pow(a.x-b.x,2)+
Math.pow(a.y-b.y,2)
)
}

let faceDistance=0

function calculateFaceDistance(landmarks){

const leftEye=landmarks[33]
const rightEye=landmarks[263]

let dx=leftEye.x-rightEye.x
let dy=leftEye.y-rightEye.y

let pixelDistance=Math.sqrt(dx*dx+dy*dy)
pixelDistance*=videoElement.videoWidth

if(pixelDistance===0){
return faceDistance
}

const realEyeDistance=6.3
const focalLength=700

faceDistance=(realEyeDistance*focalLength)/pixelDistance

return faceDistance
}

function startDistanceLock(){

if(distanceLocked||lockTimer)return

let time=3

lockTimer=setInterval(()=>{

distanceStatus.innerText="กรุณาอยู่ในระยะนี้ "+time+" วินาที"
distanceStatus.style.color="orange"

time--

if(time<0){

clearInterval(lockTimer)
distanceLocked=true

distanceStatus.innerText="ระยะถูกต้อง ✔"

if(!countdownStarted){
countdownStarted=true
startCountdown()
}

}

},1000)

}

function cancelDistanceLock(){

if(lockTimer){
clearInterval(lockTimer)
lockTimer=null
}

distanceLocked=false
}

function startCountdown(){

let time=5

countdownText.innerText="เริ่มใน "+time

let interval=setInterval(()=>{

time--

countdownText.innerText="เริ่มใน "+time

if(time<=0){

clearInterval(interval)
countdownText.innerText="เริ่มทดสอบ"

startVisionTest()

}

},1000)

}

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

let dist=calculateFaceDistance(landmarks)

canvasCtx.font="20px Arial"
canvasCtx.fillStyle="lime"
canvasCtx.fillText("Distance: "+dist.toFixed(1)+" cm",20,30)

if(dist < 45){

distanceStatus.innerText="คุณอยู่ใกล้เกินไป กรุณาถอยหลัง"
distanceStatus.style.color="red"
cancelDistanceLock()

}

else if(dist > 50){

distanceStatus.innerText="คุณอยู่ไกลเกินไป กรุณาขยับเข้ามา"
distanceStatus.style.color="red"
cancelDistanceLock()

}

else{

startDistanceLock()

}

}

}

})

async function startSystem(){

if(systemRunning)return

systemRunning=true

try{

stream=await navigator.mediaDevices.getUserMedia({video:true})
videoElement.srcObject=stream

camera=new Camera(videoElement,{

onFrame:async()=>{
if(systemRunning){
await faceMesh.send({image:videoElement})
}
},

width:640,
height:480

})

camera.start()

}catch(error){

alert("ไม่สามารถเปิดกล้องได้")

}

}

function stopSystem(){

systemRunning=false

if(camera){
camera.stop()
}

if(stream){
stream.getTracks().forEach(track=>track.stop())
}

}

const testCanvas=document.getElementById("testCanvas")
const ctx=testCanvas.getContext("2d")

let round=0
let maxRounds=10
let size=40

const directions=[
0,
Math.PI/4,
Math.PI/2,
3*Math.PI/4,
Math.PI,
5*Math.PI/4,
3*Math.PI/2,
7*Math.PI/4
]

let directionIndex=0

let timeLeft=20
let timerInterval=null

function startTimer(){

clearInterval(timerInterval)

timeLeft=20
document.getElementById("timer").innerText="เวลา: "+timeLeft

timerInterval=setInterval(()=>{

timeLeft--

document.getElementById("timer").innerText="เวลา: "+timeLeft

if(timeLeft<=0){

clearInterval(timerInterval)
stopVisionTest()

}

},1000)

}

function randomDirection(){
directionIndex=Math.floor(Math.random()*8)
}

function drawC(){

ctx.clearRect(0,0,testCanvas.width,testCanvas.height)

ctx.save()

ctx.translate(testCanvas.width/2,testCanvas.height/2)
ctx.rotate(directions[directionIndex])

ctx.lineWidth=size/5
ctx.strokeStyle="black"

ctx.beginPath()
ctx.arc(0,0,size,0.25*Math.PI,1.75*Math.PI)
ctx.stroke()

ctx.restore()

}

function nextRound(){

if(round>=maxRounds){
stopVisionTest()
return
}

randomDirection()
drawC()
startTimer()

}

function startVisionTest(){

round=0
size=40

nextRound()

}

function stopVisionTest(){

clearInterval(timerInterval)

ctx.clearRect(0,0,testCanvas.width,testCanvas.height)

let vision = calculateVision(round)

// ส่งข้อมูลไปหน้าผลลัพธ์
localStorage.setItem("visionScore", round)
localStorage.setItem("visionLevel", vision)

// ไปหน้า result
window.location.href = "result.html"

}

function answer(userDirection){

clearInterval(timerInterval)

if(userDirection===directionIndex){

round++
size=size*0.85

nextRound()

}else{

stopVisionTest()

}

}
