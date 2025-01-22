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

	// Додаємо або видаляємо клас для заборони скролу
	document.body.classList.toggle('no-scroll', menuList.classList.contains('show-menu'))
})

const signBtn = document.getElementById('signBtn')
// const modal = document.getElementById('modal')
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



// // Отримуємо елементи
// const openIcon = document.getElementById('openIcon'); // Іконка для відкриття меню
// const closeIcon = document.getElementById('closeIcon'); // Іконка для закриття меню
// const modal = document.getElementById('modal'); // Модальне вікно
// const modalOverlay = document.getElementById('modalOverlay'); // Оверлей для модального вікна
// const closeModalButton = document.getElementById('closeModal'); // Кнопка закриття модального вікна

// // Відкриваємо модальне вікно
// openIcon.addEventListener('click', function () {
// 	modal.classList.remove('hide'); // Видаляємо клас 'hide' для показу модального вікна
// 	modalOverlay.classList.remove('hide'); // Показуємо оверлей
// });

// // Закриваємо модальне вікно при натисканні на кнопку 'closeModal'
// closeModalButton.addEventListener('click', function () {
// 	modal.classList.add('hide'); // Додаємо клас 'hide' для приховування модального вікна
// 	modalOverlay.classList.add('hide'); // Приховуємо оверлей
// });

// // Закриваємо модальне вікно при натисканні на оверлей
// modalOverlay.addEventListener('click', function () {
// 	modal.classList.add('hide'); // Приховуємо модальне вікно
// 	modalOverlay.classList.add('hide'); // Приховуємо оверлей
// });

// Отримуємо елементи
const contactUsButtons = document.querySelectorAll('.btn__header'); // Обидві кнопки "Contact Us" (мобільна та десктоп)
const modal = document.getElementById('modal'); // Модальне вікно
const modalOverlay = document.getElementById('modalOverlay'); // Оверлей для модального вікна
const closeModalButton = document.getElementById('closeModal'); // Кнопка закриття модального вікна (хрестик)

// Відкриваємо модальне вікно при натисканні на будь-яку кнопку "Contact Us"
contactUsButtons.forEach(button => {
	button.addEventListener('click', function () {
		modal.classList.remove('hide'); // Видаляємо клас 'hide' для показу модального вікна
		modalOverlay.classList.remove('hide'); // Показуємо оверлей
	});
});

// Закриваємо модальне вікно при натисканні на кнопку хрестик
closeModalButton.addEventListener('click', function () {
	modal.classList.add('hide'); // Додаємо клас 'hide' для приховування модального вікна
	modalOverlay.classList.add('hide'); // Приховуємо оверлей
});

// Закриваємо модальне вікно при натисканні на оверлей
modalOverlay.addEventListener('click', function () {
	modal.classList.add('hide'); // Приховуємо модальне вікно
	modalOverlay.classList.add('hide'); // Приховуємо оверлей
});

// Отримуємо кнопку
const scrollToTopBtn = document.getElementById('scrollToTop');

// Відстежуємо прокрутку сторінки
window.addEventListener('scroll', () => {
	// Якщо прокручено більше 100px, показуємо кнопку
	if (window.scrollY > 100) {
		scrollToTopBtn.classList.add('show');
		scrollToTopBtn.classList.remove('hide');
	} else {
		// Якщо менше 100px, ховаємо кнопку
		scrollToTopBtn.classList.add('hide');
		scrollToTopBtn.classList.remove('show');
	}
});

// Додаємо обробник події для кнопки
scrollToTopBtn.addEventListener('click', () => {
	// Прокручуємо сторінку плавно до верху
	window.scrollTo({
		top: 0,
		behavior: 'smooth'
	});
});




// Забороняємо прокрутку сторінки при відкритому модальному вікні
contactUsButtons.forEach(button => {
	button.addEventListener('click', function () {
		modal.classList.remove('hide'); // Видаляємо клас 'hide' для показу модального вікна
		modalOverlay.classList.remove('hide'); // Показуємо оверлей
		document.body.classList.add('no-scroll'); // Забороняємо прокрутку
	});
});

// Дозволяємо прокрутку при закритті модального вікна
closeModalButton.addEventListener('click', function () {
	modal.classList.add('hide'); // Додаємо клас 'hide' для приховування модального вікна
	modalOverlay.classList.add('hide'); // Приховуємо оверлей
	// Якщо бургер-меню відкрите, залишаємо заблокований скрол
	if (!menuList.classList.contains('show-menu')) {
		document.body.classList.remove('no-scroll'); // Дозволяємо прокрутку, якщо меню закрите
	}
});

modalOverlay.addEventListener('click', function () {
	modal.classList.add('hide'); // Приховуємо модальне вікно
	modalOverlay.classList.add('hide'); // Приховуємо оверлей
	// Якщо бургер-меню відкрите, залишаємо заблокований скрол
	if (!menuList.classList.contains('show-menu')) {
		document.body.classList.remove('no-scroll'); // Дозволяємо прокрутку, якщо меню закрите
	}
});







// Отримуємо кнопки фільтра та всі блоги
const filterButtons = document.querySelectorAll('.swiper-container-2 .button');
const blogItems = document.querySelectorAll('.blog-item');

// Додаємо обробники подій для кнопок фільтрації
filterButtons.forEach(button => {
	button.addEventListener('click', () => {
		const filterValue = button.getAttribute('data-filter');

		// Перебираємо всі блоги і фільтруємо їх по темі
		blogItems.forEach(blog => {
			const blogCategory = blog.querySelector('.explore-futureTech__blog-item_info p').textContent;

			// Якщо фільтр "all", показуємо всі пости
			if (filterValue === 'all' || blogCategory === filterValue) {
				blog.style.display = 'flex'; // Показуємо блог
			} else {
				blog.style.display = 'none'; // Ховаємо блог
			}
		});

		// Додаємо/знімаємо активний клас для кнопок
		filterButtons.forEach(btn => btn.classList.remove('active'));
		button.classList.add('active');
	});
});



// Отримуємо всі елементи серця (лайки)
const likeButtons = document.querySelectorAll('.blog-stats .like');

// Додаємо обробник події для кожного серця
likeButtons.forEach(likeButton => {
	likeButton.addEventListener('click', () => {
		// Якщо сердечко вже червоне, то знімаємо лайк
		if (likeButton.classList.contains('liked')) {
			likeButton.classList.remove('liked');
			let currentLikes = parseFloat(likeButton.textContent.split(' ')[1].replace('k', ''));
			likeButton.innerHTML = `&#x2764; ${currentLikes - 0.5}k`;  // Зменшуємо лайки
		} else {
			likeButton.classList.add('liked');
			let currentLikes = parseFloat(likeButton.textContent.split(' ')[1].replace('k', ''));
			likeButton.innerHTML = `&#x2764; ${currentLikes + 0.5}k`;  // Збільшуємо лайки
		}
	});
});