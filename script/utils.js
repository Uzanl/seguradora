const aside = document.querySelector('aside');
const toggleBtn = document.querySelector('.toggle-btn');

document.querySelectorAll('.submenu').forEach(menu => {
  menu.addEventListener('mouseenter', () => {
    menu.setAttribute('aria-expanded', 'true');
  });
  menu.addEventListener('mouseleave', () => {
    menu.setAttribute('aria-expanded', 'false');
  });
});

toggleBtn.addEventListener('click', function () {
  aside.classList.toggle('active');
  toggleBtn.classList.toggle('active');
  const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';

  toggleBtn.setAttribute('aria-expanded', !isExpanded);
  aside.hidden = isExpanded;
});

