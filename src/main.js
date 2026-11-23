import { supabase } from './supabase.js'

import './style.css'

const savedChats = localStorage.getItem('m_chats')
const chats = savedChats ? JSON.parse(savedChats) : {
  'أحمد': ['أهلاً بيك في M 👋'],
  'محمد': ['إزيك؟']
}

const savedProfile = JSON.parse(localStorage.getItem('m_profile') || '{}')

let profile = {
  name: savedProfile.name || 'مستخدم M',
  username: savedProfile.username || 'user',
  photo: savedProfile.photo || ''
}

let currentChat = ''

document.querySelector('#app').innerHTML = `
  <div class="app">
  <section id="authPage">
    <h2>مرحباً بك في M 👋</h2>
    <input id="authEmail" type="email" placeholder="البريد الإلكتروني">
    <input id="authPassword" type="password" placeholder="كلمة المرور">
    <button id="signupBtn">إنشاء حساب</button>
    <button id="loginBtn">تسجيل الدخول</button>
    <p id="authMessage"></p>
  </section>
    <header class="top" id="appHeader" hidden>
      <button id="back" hidden>رجوع</button>
      <h1>M</h1>
      <button id="profileBtn">حسابي</button>
    </header>

    <section id="listPage" hidden>
      <h2>المحادثات</h2>
      <input id="search" placeholder="ابحث عن محادثة...">
      <div id="chats"></div>
      <button id="newChat">＋ محادثة جديدة</button>
    </section>

    <section id="messagePage" hidden>
      <h2 id="chatName"></h2>
      <div id="messages"></div>
      <form id="messageForm">
        <input id="messageInput" placeholder="اكتب رسالة..." autocomplete="off">
        <button type="submit">إرسال</button>
      </form>
    </section>

    <section id="profilePage" hidden>
      <h2>الملف الشخصي</h2>
      <div id="avatar" style="font-size:60px;text-align:center">👤</div>
      <input id="photo" type="file" accept="image/*">
      <input id="name" placeholder="الاسم">
      <input id="username" placeholder="اسم المستخدم">
      <button id="saveProfile">حفظ التعديلات</button>
      <p id="profileMessage"></p>
    </section>
  </div>
`

const $ = id => document.getElementById(id)

function saveChats() {
  localStorage.setItem('m_chats', JSON.stringify(chats))
}

function saveProfile() {
  localStorage.setItem('m_profile', JSON.stringify(profile))
}

function updateAvatar() {
  $('avatar').innerHTML = ''

  if (profile.photo) {
    const img = document.createElement('img')
    img.src = profile.photo
    img.style.width = '100px'
    img.style.height = '100px'
    img.style.objectFit = 'cover'
    img.style.borderRadius = '50%'
    $('avatar').appendChild(img)
  } else {
    $('avatar').textContent = '👤'
  }
}

async function loadProfile() {
  alert("اختبار: تم تشغيل تحميل الملف الشخصي");
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) { alert(userError?.message || "لم يتم العثور على الحساب"); return }

  const { data, error } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle()

  if (error) {
    alert("خطأ تحميل الملف الشخصي: " + error.message)
    return
  }

  if (data) {
    profile.name = data.display_name || profile.name
    profile.username = data.username || profile.username
  } else {
    const username = "user_" + user.id.slice(0, 8)
    const { error: insertError } = await supabase
      .from("profiles")
      .insert({ id: user.id, username, display_name: profile.name })

    if (insertError) {
      alert("خطأ إنشاء الملف الشخصي: " + insertError.message)
      return
    }
    profile.username = username
  }

  saveProfile()
  updateAvatar()
}

function showChats() {
  $('chats').innerHTML = ''

  Object.keys(chats).forEach(name => {
    const item = document.createElement('button')
    item.className = 'chat'
    item.textContent = name + ' — ' +
      (chats[name].at(-1) || 'ابدأ محادثة')
    item.onclick = () => openChat(name)
    $('chats').appendChild(item)
  })
}

function openChat(name) {
  currentChat = name
  $('chatName').textContent = name
  $('listPage').hidden = true
  $('profilePage').hidden = true
  $('messagePage').hidden = false
  $('back').hidden = false
  renderMessages()
}

function renderMessages() {
  $('messages').innerHTML = ''

  chats[currentChat].forEach(message => {
    const bubble = document.createElement('p')
    bubble.className = 'bubble'
    bubble.textContent = message
    $('messages').appendChild(bubble)
  })

  $('messages').scrollTop = $('messages').scrollHeight
}

$('messageForm').onsubmit = event => {
  event.preventDefault()

  const message = $('messageInput').value.trim()
  if (!message || !currentChat) return

  chats[currentChat].push(message)
  saveChats()
  $('messageInput').value = ''
  renderMessages()
  showChats()
}

$('back').onclick = () => {
  $('messagePage').hidden = true
  $('profilePage').hidden = true
  $('listPage').hidden = false
  $('back').hidden = true
  currentChat = ''
}

$('newChat').onclick = () => {
  const name = prompt('اكتب اسم المحادثة')
  if (!name || !name.trim()) return

  const cleanName = name.trim()

  if (!chats[cleanName]) {
    chats[cleanName] = []
    saveChats()
  }

  showChats()
  openChat(cleanName)
}

$('search').oninput = () => {
  const query = $('search').value.trim()

  document.querySelectorAll('.chat').forEach(item => {
    item.hidden = !item.textContent.includes(query)
  })
}

$('profileBtn').onclick = () => {
  $('listPage').hidden = true
  $('messagePage').hidden = true
  $('profilePage').hidden = false
  $('back').hidden = false

  $('name').value = profile.name
  $('username').value = profile.username
  updateAvatar()
}

$('photo').onchange = event => {
  const file = event.target.files[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    $('profileMessage').textContent = 'اختار صورة أصغر من 2 ميجابايت'
    event.target.value = ''
    return
  }

  const reader = new FileReader()

  reader.onload = () => {
    profile.photo = reader.result
    updateAvatar()
  }

  reader.readAsDataURL(file)
}

$("saveProfile").onclick = async () => {
  const name = $("name").value.trim()
  const username = $("username").value.trim().replace(/^@/, "")

  if (!name || !username) {
    $("profileMessage").textContent = "اكتب الاسم واسم المستخدم"
    return
  }

  $("profileMessage").textContent = "جاري الحفظ..."

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    $("profileMessage").textContent = "سجّل الدخول مرة أخرى"
    return
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: name, username }, { onConflict: "id" })

  if (error) {
    $("profileMessage").textContent = error.message
    return
  }

  profile.name = name
  profile.username = username
  saveProfile()
  $("profileMessage").textContent = "تم حفظ الملف الشخصي بنجاح ✅"
}

saveChats()
showChats()


$('signupBtn').onclick = async () => {
  const email = $('authEmail').value.trim()
  const password = $('authPassword').value

  $('authMessage').textContent = 'جاري إنشاء الحساب...'

  const { error } = await supabase.auth.signUp({
    email,
    password
  })

  $('authMessage').textContent = error
    ? error.message
    : 'تم إنشاء الحساب! افحص بريدك الإلكتروني إذا طُلب منك التأكيد.'
}

$('loginBtn').onclick = async () => {
  const email = $('authEmail').value.trim()
  const password = $('authPassword').value

  $('authMessage').textContent = 'جاري تسجيل الدخول...'

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  $('authMessage').textContent = error
    ? error.message
    : 'تم تسجيل الدخول بنجاح!'
}

function openApp() {
  $('authPage').hidden = true
  $('appHeader').hidden = false
  $('listPage').hidden = false
  $('messagePage').hidden = true
  $('profilePage').hidden = true
  showChats()
  loadProfile()
}

supabase.auth.getSession().then(({ data }) => {
  if (data.session) openApp()
})

$('loginBtn').onclick = async () => {
  const email = $('authEmail').value.trim()
  const password = $('authPassword').value

  $('authMessage').textContent = 'جاري تسجيل الدخول...'

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    $('authMessage').textContent = error.message
  } else {
    $('authMessage').textContent = 'تم تسجيل الدخول بنجاح'
    openApp()
  }
}

$('signupBtn').onclick = async () => {
  const email = $('authEmail').value.trim()
  const password = $('authPassword').value

  $('authMessage').textContent = 'جاري إنشاء الحساب...'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: "http://127.0.0.1:5180/" },
  })

  if (error) {
    $('authMessage').textContent = error.message
  } else if (data.session) {
    $('authMessage').textContent = 'تم إنشاء الحساب بنجاح'
    openApp()
  } else {
    $('authMessage').textContent = 'تم التسجيل. راجع بريدك الإلكتروني لتأكيد الحساب.'
  }
}
