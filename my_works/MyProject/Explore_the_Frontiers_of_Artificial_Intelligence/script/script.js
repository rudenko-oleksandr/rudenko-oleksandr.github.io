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


// Перший свайпер
const swiper1 = new Swiper('.swiper-container-1', {
	slidesPerView: 1, // Видимий один слайд за замовчуванням
	slidesPerGroup: 1, // Переміщення на один слайд
	spaceBetween: 20, // Відстань між слайдами
	loop: true, // Циклічність
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
			spaceBetween: 20,
		},
	},
});

// Другий свайпер
const swiper2Container = document.querySelector('.swiper-container-2');

let isDragging = false;
let startX;
let scrollLeft;

swiper2Container.addEventListener('wheel', (e) => {
	e.preventDefault();
	swiper2Container.scrollBy({ left: e.deltaY > 0 ? 100 : -100, behavior: 'smooth' });
});

swiper2Container.addEventListener('mousedown', (e) => {
	isDragging = true;
	startX = e.pageX - swiper2Container.offsetLeft;
	scrollLeft = swiper2Container.scrollLeft;
	swiper2Container.classList.add('active');
});

swiper2Container.addEventListener('mouseleave', () => {
	isDragging = false;
});

swiper2Container.addEventListener('mouseup', () => {
	isDragging = false;
	swiper2Container.classList.remove('active');
});

swiper2Container.addEventListener('mousemove', (e) => {
	if (!isDragging) return;
	e.preventDefault();
	const x = e.pageX - swiper2Container.offsetLeft;
	const walk = (x - startX) * 2; // Adjust scrolling speed
	swiper2Container.scrollLeft = scrollLeft - walk;
});





document.addEventListener('DOMContentLoaded', async () => {
	try {
		// Завантаження JSON-даних за допомогою Axios
		const response = await axios.get('./data/reviews.json'); // Змініть шлях до JSON за необхідності
		const data = response.data;

		// Отримання контейнера для відгуків
		const container = document.getElementById('reviews-container');

		// Генеруємо HTML для кожного відгуку
		data.reviews.forEach(review => {
			const reviewCard = `
          <div class="real-words-from-real-readers__card">
            <div class="real-words-from-real-readers__header d-flex justify-center align-center">
              <div class="real-words-from-real-readers__avatar" style="background-image: url('${review.avatar}');"></div>
              <div class="real-words-from-real-readers__info">
                <h4>${review.name}</h4>
                <p>${review.location}</p>
              </div>
              <div class="stars">
                ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
              </div>
            </div>
            <div class="real-words-from-real-readers__content">
              <p>${review.content}</p>
            </div>
          </div>
        `;
			// Додаємо HTML до контейнера
			container.innerHTML += reviewCard;
		});
	} catch (error) {
		console.error('Error loading reviews:', error);
	}
});
