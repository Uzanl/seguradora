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

document.getElementById("cad-expand").addEventListener("click", function() {
  const cadOcorrencia = document.getElementById("cad-ocorrencia");
  const arrowIcon = document.getElementById("svg-cad-expand");

  // Toggle da classe 'show' para expandir ou contrair a div
  cadOcorrencia.classList.toggle("show");

  // Toggle da classe 'rotate' para rotacionar o ícone
  arrowIcon.classList.toggle("rotate");
});

document.getElementById("pesq-expand").addEventListener("click", function() {
  const cadOcorrencia = document.getElementById("pesq-ocorrencia");
  const arrowIcon = document.getElementById("svg-pesq-expand");

  // Toggle da classe 'show' para expandir ou contrair a div
  cadOcorrencia.classList.toggle("show");

  // Toggle da classe 'rotate' para rotacionar o ícone
  arrowIcon.classList.toggle("rotate");
});



