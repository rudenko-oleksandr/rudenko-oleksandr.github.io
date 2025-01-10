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





const swiper = document.querySelector('.swiper-container');

let isDragging = false;
let startX;
let scrollLeft;

swiper.addEventListener('wheel', (e) => {
	e.preventDefault();
	swiper.scrollBy({ left: e.deltaY > 0 ? 100 : -100, behavior: 'smooth' });
});

swiper.addEventListener('mousedown', (e) => {
	isDragging = true;
	startX = e.pageX - swiper.offsetLeft;
	scrollLeft = swiper.scrollLeft;
	swiper.classList.add('active');
});

swiper.addEventListener('mouseleave', () => {
	isDragging = false;
});

swiper.addEventListener('mouseup', () => {
	isDragging = false;
});

swiper.addEventListener('mousemove', (e) => {
	if (!isDragging) return;
	e.preventDefault();
	const x = e.pageX - swiper.offsetLeft;
	const walk = (x - startX) * 2; // Adjust scrolling speed
	swiper.scrollLeft = scrollLeft - walk;
});