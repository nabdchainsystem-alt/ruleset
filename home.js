(() => {
  const stage = document.querySelector('#demoStage');
  const chip = document.querySelector('#wordChip');
  let target = document.querySelector('#dropTarget');
  const sentence = document.querySelector('#demoSentence');
  const status = document.querySelector('#demoStatus');
  const success = document.querySelector('#demoSuccess');
  const reset = document.querySelector('#demoReset');
  const help = document.querySelector('#dragHelp');

  if (!stage || !chip || !target || !sentence) return;

  let drag = null;
  let solved = false;

  function setGlow(event) {
    const box = stage.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100;
    const y = ((event.clientY - box.top) / box.height) * 100;
    stage.style.setProperty('--mx', `${x}%`);
    stage.style.setProperty('--my', `${y}%`);
  }

  function overlapsTarget() {
    const a = chip.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return x * y > Math.min(a.width * a.height, b.width * b.height) * .35;
  }

  function solve() {
    if (solved) return;
    solved = true;
    target.replaceWith(chip);
    chip.className = 'word-chip is-solved';
    chip.style.cssText = '';
    chip.setAttribute('aria-label', 'puzzle. Demonstration solved.');
    chip.disabled = true;
    status.textContent = 'STAGE 00 — SOLVED';
    help.textContent = 'The possibility was visible. The idea was yours.';
    success.setAttribute('aria-hidden', 'false');
    success.classList.add('is-visible');
    reset.hidden = false;
  }

  function resetDemo() {
    solved = false;
    const restoredTarget = document.createElement('span');
    restoredTarget.className = 'drop-target';
    restoredTarget.id = 'dropTarget';
    restoredTarget.setAttribute('aria-hidden', 'true');
    chip.replaceWith(restoredTarget);
    target = restoredTarget;
    sentence.after(chip);
    chip.className = 'word-chip';
    chip.style.cssText = '';
    chip.disabled = false;
    chip.setAttribute('aria-label', 'Move puzzle into the empty space. Press Enter to complete, or use arrow keys to move it.');
    status.textContent = 'A SMALL DEMONSTRATION';
    help.textContent = 'Drag the blue word into the empty space.';
    success.classList.remove('is-visible');
    success.setAttribute('aria-hidden', 'true');
    reset.hidden = true;
  }

  stage.addEventListener('pointermove', setGlow);

  chip.addEventListener('pointerdown', event => {
    if (solved || event.button > 0) return;
    const rect = chip.getBoundingClientRect();
    const containerRect = chip.offsetParent.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      containerLeft: containerRect.left,
      containerTop: containerRect.top
    };
    chip.setPointerCapture(event.pointerId);
    chip.classList.add('is-dragging');
    event.preventDefault();
  });

  chip.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    chip.style.left = `${event.clientX - drag.containerLeft - drag.dx}px`;
    chip.style.top = `${event.clientY - drag.containerTop - drag.dy}px`;
    target.classList.toggle('is-over', overlapsTarget());
  });

  function endDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    chip.classList.remove('is-dragging');
    const complete = overlapsTarget();
    target.classList.remove('is-over');
    drag = null;
    if (complete) solve();
  }

  chip.addEventListener('pointerup', endDrag);
  chip.addEventListener('pointercancel', endDrag);

  chip.addEventListener('keydown', event => {
    if (solved) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      solve();
      return;
    }
    const amount = event.shiftKey ? 18 : 7;
    const directions = {
      ArrowLeft: [-amount, 0],
      ArrowRight: [amount, 0],
      ArrowUp: [0, -amount],
      ArrowDown: [0, amount]
    };
    const delta = directions[event.key];
    if (!delta) return;
    event.preventDefault();
    const left = Number.parseFloat(getComputedStyle(chip).left) || chip.offsetLeft;
    const top = Number.parseFloat(getComputedStyle(chip).top) || chip.offsetTop;
    chip.style.left = `${left + delta[0]}px`;
    chip.style.top = `${top + delta[1]}px`;
    target.classList.toggle('is-over', overlapsTarget());
    if (overlapsTarget()) solve();
  });

  reset.addEventListener('click', resetDemo);
})();
