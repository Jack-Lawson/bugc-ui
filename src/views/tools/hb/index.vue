<template>
  <section ref="pageRef" class="birthday-page" @click="handlePageClick">
    <div class="birthday-actions" @click.stop>
      <button class="action-button" type="button" :title="isFullscreen ? '退出全屏' : '全屏播放'" @click="toggleFullscreen">
        {{ isFullscreen ? '退出全屏' : '全屏' }}
      </button>
    </div>

    <button
      class="play-pause"
      :class="{ playing: isPlaying }"
      type="button"
      aria-label="播放或暂停音乐"
      @click.stop="togglePlay(!isPlaying)"
    />

    <div v-show="!started" class="start-sign">
      <p class="two">温馨提醒：佩戴耳机并播放音乐可获得最佳体验哦</p>
      <button class="start-button two" type="button" @click.stop="startExperience">准备好了，我们开始吧！</button>
    </div>

    <div ref="containerRef" class="birthday-container">
      <div class="one scene">
        <h1 class="one-title">
          <span>{{ birthdayData.greeting }}</span>
          <span>{{ birthdayData.name }}</span>
        </h1>
        <p class="two">{{ birthdayData.greetingText }}</p>
      </div>

      <div class="three scene">
        <p>{{ birthdayData.text1 }}</p>
      </div>

      <div class="four scene">
        <div class="text-box">
          <p class="hbd-chatbox">
            <span v-for="(char, index) in chatTextChars" :key="`chat-${index}`">{{ char }}</span>
          </p>
          <p class="fake-btn">{{ birthdayData.sendButtonLabel }}</p>
        </div>
      </div>

      <div class="five scene">
        <p class="idea-1">{{ birthdayData.text2 }}</p>
        <p class="idea-2">{{ birthdayData.text3 }}</p>
        <p class="idea-3">
          <span>{{ birthdayData.text4 }}</span>
          <strong>{{ birthdayData.text4Adjective }}</strong>
        </p>
        <p class="idea-4">{{ birthdayData.text5Entry }}</p>
        <p class="idea-5">
          <span>{{ birthdayData.text5Content }}</span>
          <span class="smiley">{{ birthdayData.smiley }}</span>
        </p>
        <p class="idea-6">
          <span>{{ birthdayData.bigTextPart1 }}</span>
          <span>{{ birthdayData.bigTextPart2 }}</span>
        </p>
      </div>

      <div class="six scene">
        <img :src="portraitUrl" alt="" class="lydia-dp">
        <img :src="hatUrl" alt="" class="hat">
        <div class="wish">
          <h3 class="wish-hbd">
            <span v-for="(char, index) in wishHeadingChars" :key="`wish-${index}`">{{ char }}</span>
          </h3>
          <h5>{{ birthdayData.wishText }}</h5>
        </div>
      </div>

      <div class="seven">
        <div class="baloons">
          <img v-for="(_, index) in 33" :key="index" :src="balloonUrls[index % balloonUrls.length]" alt="">
        </div>
      </div>

      <div class="eight">
        <svg v-for="index in 9" :key="index" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" />
        </svg>
      </div>

      <div class="nine scene">
        <p>{{ birthdayData.outroText }}</p>
        <p id="replay" class="replay" @click.stop="replay">{{ birthdayData.replayText }}</p>
        <p class="last-smile">{{ birthdayData.outroSmiley }}</p>
      </div>
    </div>

    <canvas ref="canvasRef" class="fireworks-canvas" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import balloonOneUrl from './assets/img/ballon1.svg'
import balloonTwoUrl from './assets/img/ballon2.svg'
import balloonThreeUrl from './assets/img/ballon3.svg'
import hatUrl from './assets/img/hat.svg'
import pauseUrl from './assets/img/pause.svg'
import playUrl from './assets/img/play.svg'
import portraitUrl from './assets/img/lydia2.png'
import musicUrl from './assets/music/bgMusic.mp3'

type FireworkParticle = {
  x: number
  y: number
  color: string
  angle: number
  speed: number
  size: number
  alpha: number
  gravity: number
}

type Firework = {
  particles: FireworkParticle[]
}

const birthdayData = {
  greeting: '你好啊',
  name: '都琳娜',
  greetingText: '很庆幸在这个世界的某一天遇见你',
  wishText: '愿你眼里有光，心中有热爱。新的一岁，平安顺遂，所遇皆温柔，所行皆坦途。',
  text1: '今天，是属于你的特别日子。',
  textInChatBox: '生日快乐！愿你今天被真诚、惊喜和很多很多快乐包围。',
  sendButtonLabel: '发送',
  text2: '原本只想认真说一句祝福',
  text3: '可想了很久，还是觉得太普通。',
  text4: '所以，我想为你留下一个',
  text4Adjective: '特别的瞬间',
  text5Entry: '因为',
  text5Content: '你对我来说，一直都是很特别的人。',
  smiley: ':)',
  bigTextPart1: '所',
  bigTextPart2: '以',
  wishHeading: '生日快乐！',
  outroText: '希望这个小小的惊喜，能让你笑一下。',
  replayText: '想再看一遍的话，点这里重播；也愿未来还有新的惊喜。',
  outroSmiley: ':)'
}

const pageRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const started = ref(false)
const isPlaying = ref(false)
const isImmersive = ref(false)
const isFullscreen = ref(false)
const balloonUrls = [balloonTwoUrl, balloonOneUrl, balloonThreeUrl]
const chatTextChars = computed(() => birthdayData.textInChatBox.split(''))
const wishHeadingChars = computed(() => birthdayData.wishHeading.split(''))
const playIconCss = computed(() => `url("${playUrl}")`)
const pauseIconCss = computed(() => `url("${pauseUrl}")`)

let audio: HTMLAudioElement | null = null
let timeline: gsap.core.Timeline | null = null
let gsapContext: gsap.Context | null = null
let animationFrameId = 0
let canvasContext: CanvasRenderingContext2D | null = null
let fireworks: Firework[] = []

const fireworkColors = ['#ff5733', '#ffbd33', '#33ff57', '#3357ff', '#f033ff']
const immersiveClassName = 'hb-immersive-layout'

function createTimeline() {
  if (!pageRef.value) return null

  gsapContext?.revert()
  gsapContext = gsap.context(() => {
    gsap.set('.birthday-container', { visibility: 'hidden' })
    gsap.set('.scene, .five p, .eight svg', { clearProps: 'all' })
    gsap.set('.hbd-chatbox span, .wish-hbd span', { visibility: 'hidden' })

    const ideaTextEnter = {
      opacity: 0,
      y: -20,
      rotationX: 5,
      skewX: '15deg'
    }
    const ideaTextLeave = {
      opacity: 0,
      y: 20,
      rotationY: 5,
      skewX: '-15deg'
    }

    timeline = gsap.timeline({ paused: true })
      .to('.birthday-container', { duration: 0.1, visibility: 'visible' })
      .from('.one', { duration: 0.7, opacity: 0, y: 10 })
      .from('.two', { duration: 0.4, opacity: 0, y: 10 })
      .to('.one', { duration: 0.7, opacity: 0, y: 10 }, '+=2.5')
      .to('.two', { duration: 0.7, opacity: 0, y: 10 }, '-=1')
      .from('.three', { duration: 0.7, opacity: 0, y: 10 })
      .to('.three', { duration: 0.7, opacity: 0, y: 10 }, '+=2')
      .from('.four', { duration: 0.7, scale: 0.2, opacity: 0 })
      .from('.fake-btn', { duration: 0.3, scale: 0.2, opacity: 0 })
      .to('.hbd-chatbox span', { duration: 0.5, visibility: 'visible', stagger: 0.05 })
      .to('.fake-btn', { duration: 0.1, backgroundColor: '#8fe3b6' })
      .to('.four', { duration: 0.5, scale: 0.2, opacity: 0, y: -150 }, '+=0.7')
      .from('.idea-1', { duration: 0.7, ...ideaTextEnter })
      .to('.idea-1', { duration: 0.7, ...ideaTextLeave }, '+=1.5')
      .from('.idea-2', { duration: 0.7, ...ideaTextEnter })
      .to('.idea-2', { duration: 0.7, ...ideaTextLeave }, '+=1.5')
      .from('.idea-3', { duration: 0.7, ...ideaTextEnter })
      .to('.idea-3 strong', { duration: 0.5, scale: 1.2, x: 10, backgroundColor: 'rgb(21, 161, 237)', color: '#fff' })
      .to('.idea-3', { duration: 0.7, ...ideaTextLeave }, '+=1.5')
      .from('.idea-4', { duration: 0.7, ...ideaTextEnter })
      .to('.idea-4', { duration: 0.7, ...ideaTextLeave }, '+=1.5')
      .from('.idea-5', { duration: 0.7, rotationX: 15, rotationZ: -10, skewY: '-5deg', y: 50, z: 10, opacity: 0 }, '+=0.5')
      .to('.idea-5 .smiley', { duration: 0.7, rotation: 90, x: 8 }, '+=0.4')
      .to('.idea-5', { duration: 0.7, scale: 0.2, opacity: 0 }, '+=2')
      .from('.idea-6 span', { duration: 0.8, scale: 3, opacity: 0, rotation: 15, ease: 'expo.out', stagger: 0.2 })
      .to('.idea-6 span', { duration: 0.8, scale: 3, opacity: 0, rotation: -15, ease: 'expo.out', stagger: 0.2 }, '+=1')
      .fromTo('.baloons img', { opacity: 0.9, y: 1400 }, { duration: 2.5, opacity: 1, y: -1000, stagger: 0.2 })
      .from('.lydia-dp', { duration: 0.5, scale: 3.5, opacity: 0, x: 25, y: -25, rotationZ: -45 }, '-=2')
      .from('.hat', { duration: 0.5, x: -100, y: 350, rotation: -180, opacity: 0 })
      .from('.wish-hbd span', { duration: 0.7, opacity: 0, y: -50, rotation: 150, skewX: '30deg', ease: 'elastic.out(1, 0.5)', stagger: 0.1 })
      .fromTo('.wish-hbd span', { scale: 1.4, rotationY: 150 }, { duration: 0.7, scale: 1, rotationY: 0, color: '#ff69b4', ease: 'expo.out', stagger: 0.1 }, 'party')
      .from('.wish h5', { duration: 0.5, opacity: 0, y: 10, skewX: '-15deg' }, 'party')
      .to('.eight svg', { duration: 1.5, visibility: 'visible', opacity: 0, scale: 80, repeat: 3, repeatDelay: 1.4, stagger: 0.3 })
      .to('.six', { duration: 0.5, opacity: 0, y: 30, zIndex: -1 })
      .from('.nine p', { duration: 1, ...ideaTextEnter, stagger: 1.2 })
      .to('.last-smile', { duration: 0.5, rotation: 90 }, '+=1')
  }, pageRef.value)

  return timeline
}

async function startExperience() {
  if (started.value) return

  applyImmersive(true)
  started.value = true
  await nextTick()
  const activeTimeline = createTimeline()
  activeTimeline?.play(0)
  togglePlay(true)
}

function replay() {
  if (!timeline) {
    createTimeline()
  }
  timeline?.restart()
  togglePlay(true)
}

function togglePlay(play: boolean) {
  if (!audio) return

  isPlaying.value = play
  if (play) {
    audio.play().catch(() => {
      isPlaying.value = false
    })
  } else {
    audio.pause()
  }
}

function applyImmersive(enabled: boolean) {
  isImmersive.value = enabled
  document.body.classList.toggle(immersiveClassName, enabled)
  nextTick(resizeCanvas)
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await pageRef.value?.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  } catch (error) {
    console.warn('[生日祝福] 全屏切换失败:', error)
  }
}

function handleFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
  nextTick(resizeCanvas)
}

function resizeCanvas() {
  const canvas = canvasRef.value
  const page = pageRef.value
  if (!canvas || !page) return

  const rect = page.getBoundingClientRect()
  canvas.width = Math.max(1, Math.floor(rect.width))
  canvas.height = Math.max(1, Math.floor(rect.height))
}

function createParticle(x: number, y: number, color: string, angle: number, speed: number): FireworkParticle {
  return {
    x,
    y,
    color,
    angle,
    speed,
    size: Math.random() * 2 + 1,
    alpha: 1,
    gravity: 0.02
  }
}

function createFirework(x: number, y: number, particleCount = 30): Firework {
  const particles = Array.from({ length: particleCount }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 3 + 2
    const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)]
    return createParticle(x, y, color, angle, speed)
  })

  return { particles }
}

function updateParticle(particle: FireworkParticle) {
  particle.x += Math.cos(particle.angle) * particle.speed
  particle.y += Math.sin(particle.angle) * particle.speed
  particle.speed *= 0.98
  particle.alpha -= 0.015
  particle.speed -= particle.gravity
}

function drawParticle(particle: FireworkParticle) {
  if (!canvasContext) return

  canvasContext.globalAlpha = Math.max(0, particle.alpha)
  canvasContext.fillStyle = particle.color
  canvasContext.beginPath()
  canvasContext.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
  canvasContext.fill()
  canvasContext.globalAlpha = 1
}

function animateFireworks() {
  const canvas = canvasRef.value
  if (!canvas || !canvasContext) return

  canvasContext.clearRect(0, 0, canvas.width, canvas.height)
  fireworks = fireworks
    .map((firework) => {
      firework.particles.forEach(updateParticle)
      firework.particles = firework.particles.filter((particle) => particle.alpha > 0)
      firework.particles.forEach(drawParticle)
      return firework
    })
    .filter((firework) => firework.particles.length > 0)

  animationFrameId = requestAnimationFrame(animateFireworks)
}

function handlePageClick(event: MouseEvent) {
  const page = pageRef.value
  if (!page || !started.value) return

  const rect = page.getBoundingClientRect()
  fireworks.push(createFirework(event.clientX - rect.left, event.clientY - rect.top))
}

onMounted(() => {
  audio = new Audio(musicUrl)
  audio.preload = 'auto'
  audio.loop = true
  audio.addEventListener('ended', () => {
    isPlaying.value = false
  })

  canvasContext = canvasRef.value?.getContext('2d') || null
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  animationFrameId = requestAnimationFrame(animateFireworks)
})

onUnmounted(() => {
  applyImmersive(false)
  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  cancelAnimationFrame(animationFrameId)
  fireworks = []
  timeline?.kill()
  gsapContext?.revert()
  if (audio) {
    audio.pause()
    audio.src = ''
    audio = null
  }
})
</script>

<style scoped lang="scss">
@font-face {
  font-family: 'HbBirthdayFont';
  src: url('./assets/fonts/LXGWWenKai-Regular.ttf') format('truetype');
  font-display: swap;
}

.birthday-page {
  --play-icon: v-bind(playIconCss);
  --pause-icon: v-bind(pauseIconCss);

  position: relative;
  min-height: calc(100vh - 120px);
  overflow: hidden;
  color: #1f2937;
  background: #fff;
  font-family: 'HbBirthdayFont', 'Microsoft YaHei', sans-serif;
}

.birthday-actions {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 6;
  display: flex;
  gap: 8px;
}

.action-button {
  min-width: 72px;
  height: 34px;
  padding: 0 12px;
  color: #1f2937;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.55);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(8px);
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.action-button:hover {
  color: #03a957;
  border-color: #03c160;
  transform: translateY(-1px);
}

.fireworks-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.birthday-container {
  position: relative;
  z-index: 1;
  width: min(920px, 100%);
  min-height: calc(100vh - 120px);
  margin: 0 auto;
  overflow: hidden;
  text-align: center;
  visibility: hidden;
}

.birthday-container > div.scene {
  position: absolute;
  inset-inline: 0;
  top: 20vh;
}

.birthday-container div.six {
  top: 15vh;
  z-index: 1;
}

.birthday-container div.seven,
.birthday-container div.eight {
  position: absolute;
  inset: 0;
  width: 100%;
  min-height: calc(100vh - 120px);
}

.one-title {
  display: flex;
  justify-content: center;
  gap: 0.4em;
  margin: 0;
  font-size: clamp(3rem, 7vw, 4.5rem);
  font-weight: 700;
  line-height: 1.15;
}

.two {
  font-size: 1.2rem;
  font-weight: 300;
}

.three {
  font-size: clamp(2rem, 5vw, 3rem);
}

.four .text-box {
  position: relative;
  width: min(600px, 90%);
  margin: 0 auto;
  padding: 10px;
  border: 3px solid #aaa;
  border-radius: 5px;
}

.text-box p {
  margin: 0;
  text-align: left;
}

.text-box span {
  visibility: hidden;
}

.text-box .fake-btn {
  position: absolute;
  right: 5px;
  bottom: 2px;
  padding: 8px 16px;
  color: #fff;
  background-color: #03c160;
  border-radius: 8px;
}

.five p {
  position: absolute;
  inset-inline: 0;
  margin: 0;
  font-size: clamp(1.6rem, 4vw, 2rem);
}

.idea-3 strong {
  display: inline-block;
  padding: 3px 5px;
  border-radius: 3px;
}

.five .idea-5 {
  font-size: clamp(3rem, 8vw, 4rem);
}

.idea-5 span,
.idea-6 span,
.wish-hbd span {
  display: inline-block;
}

.idea-6 span {
  font-size: clamp(8rem, 20vw, 15rem);
}

.six {
  position: relative;
}

.six img {
  display: inline-block;
  max-width: 100%;
  height: auto;
}

.lydia-dp {
  width: min(240px, 52vw);
  border-radius: 999px;
}

.six .hat {
  position: absolute;
  top: -70px;
  left: 49%;
  width: 80px;
  transform: scale(1.1);
}

.wish-hbd {
  margin: 0;
  font-size: clamp(2.2rem, 6vw, 3rem);
  text-transform: uppercase;
}

.wish h5 {
  max-width: 760px;
  margin: 10px auto 0;
  padding-inline: 20px;
  font-size: clamp(1.4rem, 3.5vw, 2rem);
  font-weight: 300;
}

.baloons img {
  position: absolute;
  display: inline-block;
}

.baloons img:nth-child(even) {
  left: -10%;
}

.baloons img:nth-child(odd) {
  right: -10%;
}

.baloons img:nth-child(3n) {
  left: 30%;
}

.eight svg {
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  width: 25px;
  visibility: hidden;
}

.eight svg:nth-child(1) {
  top: 7%;
  left: 5%;
  fill: #bd6ecf;
}

.eight svg:nth-child(2) {
  top: 23%;
  left: 35%;
  fill: #7dd175;
}

.eight svg:nth-child(3) {
  top: 33%;
  left: 23%;
  fill: #349d8b;
}

.eight svg:nth-child(4) {
  top: 43%;
  left: 57%;
  fill: #347a9d;
}

.eight svg:nth-child(5) {
  top: 68%;
  left: 7%;
  fill: #c66053;
}

.eight svg:nth-child(6) {
  top: 42%;
  left: 77%;
  fill: #bfaa40;
}

.eight svg:nth-child(7) {
  top: 68%;
  left: 83%;
  fill: #e3bae8;
}

.eight svg:nth-child(8) {
  top: 86%;
  left: 37%;
  fill: #8762cb;
}

.eight svg:nth-child(9) {
  top: 94%;
  left: 87%;
  fill: #9a90da;
}

.nine p {
  margin: 0 16px 12px;
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 300;
}

.replay {
  position: relative;
  z-index: 3;
  cursor: pointer;
}

.play-pause {
  position: absolute;
  top: 64px;
  right: 18px;
  z-index: 5;
  width: 50px;
  height: 50px;
  cursor: pointer;
  background-color: transparent;
  background-image: var(--play-icon);
  background-repeat: no-repeat;
  background-size: contain;
  border: none;
  transition: transform 0.3s ease-in-out;
}

.play-pause.playing {
  background-image: var(--pause-icon);
  animation: rotate 2s linear infinite;
}

.start-sign {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: calc(100vh - 120px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
}

.start-button {
  padding: 1rem 1.6rem;
  cursor: pointer;
  background: transparent;
  border: 1px solid #03c160;
  border-radius: 5px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.start-button:hover {
  color: #fff;
  background-color: #03c160;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media screen and (max-width: 500px) {
  .birthday-container {
    width: 100%;
  }

  .birthday-container > div.scene {
    top: 18vh;
  }

  .four .text-box {
    width: 90%;
  }

  .text-box .fake-btn {
    bottom: -48px;
  }

  .idea-5 span {
    display: block;
  }

  .six .hat {
    top: -20px;
    left: 42%;
    width: 50px;
  }

  .play-pause {
    top: 68px;
    right: 18px;
    width: 42px;
    height: 42px;
  }

  .birthday-actions {
    top: 14px;
    right: 14px;
  }

  .action-button {
    min-width: 64px;
    height: 32px;
    padding: 0 10px;
    font-size: 12px;
  }
}
</style>

<style lang="scss">
body.hb-immersive-layout {
  .layout-sider,
  .layout-sider-toggle,
  .layout-header,
  .tab-bar {
    display: none !important;
  }

  .layout-content {
    padding: 0 !important;
    margin: 0 !important;
    height: 100vh !important;
    min-height: 100vh !important;
    background: #fff !important;
  }

  .layout,
  .layout > .n-layout,
  .layout-content,
  .layout-content > .n-layout-scroll-container {
    height: 100vh !important;
  }

  .birthday-page,
  .birthday-container,
  .start-sign,
  .birthday-container div.seven,
  .birthday-container div.eight {
    min-height: 100vh;
  }
}
</style>
