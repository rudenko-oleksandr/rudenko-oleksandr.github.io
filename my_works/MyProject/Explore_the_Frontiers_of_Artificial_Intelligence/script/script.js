const burgerIcons = document.getElementById('burgerIcons')
const openIcon = document.getElementById('openIcon')
const closeIcon = document.getElementById('closeIcon')
const menuList = document.getElementById('menuList')
const btnMobileHeader = document.getElementById('btnMobileHeader')

burgerIcons.addEventListener('click', () => {
	menuList.classList.toggle('show-menu')
	btnMobileHeader.classList.toggle('show-menu-btn')
	openIcon.classList.toggle('hide')
	closeIcon.classList.toggle('hide')
})


const signBtn = document.getElementById('signBtn')
const modal = document.getElementById('modal')
const closeModalIcon = document.getElementById('closeModalIcon')

// signBtn.addEventListener('click', () => {
// 	modal.classList.remove('hide')
// })
// closeModalIcon.addEventListener('click', () => {
// 	modal.classList.add('hide')
// })





const swiper = new Swiper('.swiper-container2', {
	slidesPerView: 1, // Видимий один слайд за замовчуванням
	slidesPerGroup: 1, // Переміщення на один слайд
	spaceBetween: 1, // Відстань між слайдами
	loop: true, // Відсутня циклічність
	watchSlidesVisibility: true, // Відстеження видимості слайдів
	watchSlidesProgress: true, // Відстеження прогресу слайдів
	navigation: {
		nextEl: '.swiper-button-next',
		prevEl: '.swiper-button-prev',
	},
	pagination: {
		el: '.swiper-pagination',
		clickable: true,
	},
	breakpoints: {
		768: {
			slidesPerView: 3, // Видно три слайди на великих екранах
			slidesPerGroup: 1, // Переміщення на три слайди
			spaceBetween: 1,
		},
	},
});