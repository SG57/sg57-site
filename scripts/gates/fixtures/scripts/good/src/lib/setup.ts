export function setup() {
  document.addEventListener('astro:after-swap', () => {
    document.getElementById('c')?.addEventListener('click', () => {});
  });
}
