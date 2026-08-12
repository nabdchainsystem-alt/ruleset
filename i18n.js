/* ==========================================================================
   RULESET — languages
   --------------------------------------------------------------------------
   Chrome strings only. Level text lives next to the level that uses it, as
   { en: '…', ar: '…' } objects resolved through ctx.t() / engine.t().

   Adding a language:
     1. add a key here with the same shape (`dir` decides RTL)
     2. add the same key to every {en, ar} object in levels.js
     3. add it to ORDER below — the toggle cycles through it
   Anything missing falls back to English, so a partial translation still runs.
   ========================================================================== */

window.RULESET_I18N = {

  ORDER: ['en', 'ar'],

  en: {
    dir: 'ltr',
    htmlLang: 'en',
    /* the toggle shows the language you would switch TO */
    switchLabel: 'عربي',
    switchTitle: 'Switch to Arabic',

    /* shown when the page is still zoomed after levels 6 / 7 */
    zoomStill: 'Still zoomed to',
    zoomReset: 'to reset',
    zoomPinch: 'pinch back out',

    hint: 'Hint',
    more: 'More',
    restart: 'Restart',
    skip: 'Skip',
    skipTitle: 'Move on without solving this one — you can come back',
    startOver: 'Start over',
    startOverTitle: 'Erase all progress and go back to level 1',
    erase: 'Erase all progress?',
    next: 'Next',
    playAgain: 'Play again',

    solved: 'SOLVED',
    complete: 'COMPLETE',
    completeSub: (n, total) => 'You finished every rule. ' + n + '/' + total,

    dropToRemove: 'drop to remove',
    putItBack: 'put it back',
    themeTitle: 'Toggle theme',
    stageLabel: 'puzzle stage',

    devTitle: 'DEV',
    devClose: 'press <kbd>`</kbd> to close',
    devUnlock: 'Unlock all',
    devSolve: 'Solve level',
    devWipe: 'Wipe progress'
  },

  ar: {
    dir: 'rtl',
    htmlLang: 'ar',
    switchLabel: 'EN',
    switchTitle: 'التبديل إلى الإنجليزية',

    zoomStill: 'التكبير ما زال على',
    zoomReset: 'لإعادة الضبط',
    zoomPinch: 'صغِّر بإصبعيك',

    hint: 'تلميح',
    more: 'المزيد',
    restart: 'إعادة',
    skip: 'تخطٍّ',
    skipTitle: 'انتقل دون حل هذا المستوى — يمكنك العودة إليه',
    startOver: 'البدء من جديد',
    startOverTitle: 'محو كل التقدم والعودة إلى المستوى الأول',
    erase: 'محو كل التقدم؟',
    next: 'التالي',
    playAgain: 'العب مجددًا',

    solved: 'تم الحل',
    complete: 'اكتمل',
    completeSub: (n, total) => 'أنهيت كل القواعد. ' + n + '/' + total,

    dropToRemove: 'أفلت هنا للحذف',
    putItBack: 'أعده إلى الجملة',
    themeTitle: 'تبديل المظهر',
    stageLabel: 'ساحة اللغز',

    devTitle: 'تطوير',
    devClose: 'اضغط <kbd>`</kbd> للإغلاق',
    devUnlock: 'فتح الكل',
    devSolve: 'حل المستوى',
    devWipe: 'محو التقدم'
  }

};
