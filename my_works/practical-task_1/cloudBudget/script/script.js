const burgerIcons = document.getElementById('burgerIcons')
const openIcon = document.getElementById('openIcon')
const closeIcon = document.getElementById('closeIcon')
const menuList = document.getElementById('menuList')

burgerIcons.addEventListener('click', () => {
	menuList.classList.toggle('show-menu')
	openIcon.classList.toggle('hide')
	closeIcon.classList.toggle('hide')
})


const signBtn = document.getElementById('signBtn')
const modal = document.getElementById('modal')
const closeModalIcon = document.getElementById('closeModalIcon')

signBtn.addEventListener('click', ()=> {
	modal.classList.remove('hide')
})
closeModalIcon.addEventListener('click', ()=> {
	modal.classList.add('hide')
})