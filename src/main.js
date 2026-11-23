import { supabase } from './supabase.js'
import './style.css'

const $ = (id) => document.getElementById(id)
alert('M بدأ التشغيل')
const savedChats = localStorage.getItem('m_chats')
const chats = savedChats ? JSON.parse(savedChats) : {
  'أحمد': ['أهلاً بيك في M 👋'],
  'محمد': ['إزيك؟']
}

const savedProfile = JSON.parse(localStorage.getItem('m_profile') || '{}')

let profile = {
  name: savedProfile.name || '',
  phone: savedProfile.phone || ''
}

function showMessage(message) {
  alert(message)
}

async function openApp() {
  $('authPage').hidden = true
  $('appHeader').hidden = false
  $('listPage').hidden = false
  $('messagePage').hidden = true
  $('profilePage').hidden = true

  showChats()
  await loadProfile()
}

function showAuth() {
  $('authPage').hidden = false
  $('appHeader').hidden = true
  $('listPage').hidden = true
  $('messagePage').hidden = true
  $('profilePage').hidden = true
}

function saveChats() {
  localStorage.setItem('m_chats', JSON.stringify(chats))
}

function showChats() {
  const list = $('chatsList')
  if (!list) return

  list.innerHTML = ''

  Object.keys(chats).forEach(name => {
    const button = document.createElement('button')
    button.textContent = name
    button.onclick = () => openChat(name)
    list.appendChild(button)
  })
}

function openChat(name) {
  const title = $('chatTitle')
  const messages = $('messages')

  if (title) title.textContent = name
  if (messages) {
    messages.innerHTML = ''
    ;(chats[name] || []).forEach(message => {
      const p = document.createElement('p')
      p.textContent = message
      messages.appendChild(p)
    })
  }

  $('listPage').hidden = true
  $('messagePage').hidden = false
}

async function loadProfile() {
  const { data: { user }, error: userError } =
    await supabase.auth.getUser()

  if (userError) {
    console.error(userError)
    return
  }

  if (!user) return

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error(error)
    return
  }

  if (data) {
    profile.name = data.name || profile.name
    profile.phone = data.phone || profile.phone
  }

  localStorage.setItem('m_profile', JSON.stringify(profile))

  if ($('profileName')) $('profileName').value = profile.name
  if ($('profilePhone')) $('profilePhone').value = profile.phone
}

const signupBtn = $('signupBtn')
const loginBtn = $('loginBtn')
const logoutBtn = $('logoutBtn')

if (signupBtn) {
  signupBtn.onclick = async () => {
    const email = $('email')?.value.trim()
    const password = $('password')?.value

    if (!email || !password) {
      showMessage('اكتب البريد الإلكتروني وكلمة المرور')
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://m-92cw.netlify.app/'
      }
    })

    if (error) {
      showMessage(error.message)
    } else {
      showMessage('تم إنشاء الحساب. راجع بريدك الإلكتروني لتأكيد الحساب.')
    }
  }
}

if (loginBtn) {
  loginBtn.onclick = async () => {
    const email = $('email')?.value.trim()
    const password = $('password')?.value

    if (!email || !password) {
      showMessage('اكتب البريد الإلكتروني وكلمة المرور')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      showMessage(error.message)
    } else {
      await openApp()
    }
  }
}

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await supabase.auth.signOut()
    showAuth()
  }
}

const sendBtn = $('sendBtn')

if (sendBtn) {
  sendBtn.onclick = () => {
    const input = $('messageInput')
    const message = input?.value.trim()
    const name = $('chatTitle')?.textContent

    if (!message || !name) return

    chats[name] = chats[name] || []
    chats[name].push(message)

    saveChats()
    openChat(name)

    if (input) input.value = ''
  }
}

const backBtn = $('backBtn')

if (backBtn) {
  backBtn.onclick = () => {
    $('messagePage').hidden = true
    $('listPage').hidden = false
    showChats()
  }
}

const profileBtn = $('profileBtn')

if (profileBtn) {
  profileBtn.onclick = () => {
    $('listPage').hidden = true
    $('profilePage').hidden = false
  }
}

const saveProfileBtn = $('saveProfileBtn')

if (saveProfileBtn) {
  saveProfileBtn.onclick = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    profile.name = $('profileName')?.value.trim() || ''
    profile.phone = $('profilePhone')?.value.trim() || ''

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: profile.name,
        phone: profile.phone
      })

    if (error) {
      showMessage(error.message)
      return
    }

    localStorage.setItem('m_profile', JSON.stringify(profile))
    showMessage('تم حفظ الملف الشخصي')
  }
}

supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error(error)
    showAuth()
    return
  }

  if (data.session) {
    openApp()
  } else {
    showAuth()
  }
})
