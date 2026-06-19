(function () {
  const navItems = [
    { key: 'home', title: 'Home', href: 'index.html', description: 'Toolkit overview and quick links' },
    { key: 'resize', title: 'Image Resizer', href: 'resize.html', description: 'Generate all marketing image sizes' },
    { key: 'qr', title: 'QR Code Generator', href: 'qr.html', description: 'Create and download QR codes' },
    { key: 'utm', title: 'UTM Link Builder', href: 'utm-builder.html', description: 'Create tracked campaign links' }
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getCurrentItem(currentKey) {
    return navItems.find(function (item) {
      return item.key === currentKey;
    }) || null;
  }

  function buildNavigation(currentKey) {
    return navItems.map(function (item) {
      const current = item.key === currentKey ? ' aria-current="page"' : '';
      return '<li class="app-nav__item">' +
        '<a class="app-nav__link" href="' + escapeHtml(item.href) + '"' + current + '>' +
        escapeHtml(item.title) +
        '</a>' +
        '</li>';
    }).join('');
  }

  function buildBreadcrumbs(currentKey) {
    if (!currentKey || currentKey === 'home') {
      return '';
    }

    const currentItem = getCurrentItem(currentKey);
    if (!currentItem) {
      return '';
    }

    return '' +
      '<nav class="app-breadcrumbs" aria-label="Breadcrumb">' +
        '<ol class="app-breadcrumbs__list">' +
          '<li class="app-breadcrumbs__item"><a href="index.html">Home</a></li>' +
          '<li class="app-breadcrumbs__item"><span class="app-breadcrumbs__current">' + escapeHtml(currentItem.title) + '</span></li>' +
        '</ol>' +
      '</nav>';
  }

  function createShell(pageContentHtml) {
    const body = document.body;
    const title = body.dataset.appTitle || document.title || 'Toolkit page';
    const intro = body.dataset.appIntro || '';
    const currentKey = body.dataset.appKey || '';

    return '' +
      '<div class="app-shell">' +
        '<header class="app-header">' +
          '<div class="app-header__inner">' +
            '<a class="app-header__brand" href="index.html" aria-label="Marketing Tools home">' +
              '<img class="app-header__logo" src="img/logo_dual.png" alt="Newbury College logo">' +
              '<span class="app-header__brand-text">Marketing Tools</span>' +
            '</a>' +
            '<div class="app-header__meta">' +
              '<a class="app-header__utility-link" href="https://livenewburycollegeac.sharepoint.com/sites/marketinghub">Return to SharePoint</a>' +
            '</div>' +
          '</div>' +
        '</header>' +
        '<div class="app-layout">' +
          '<aside class="app-sidebar" aria-label="Toolkit navigation">' +
            '<div class="app-sidebar__header">' +
              '<h2 class="app-sidebar__title">Toolkit</h2>' +
              '<p class="app-sidebar__hint">Choose a tool to continue.</p>' +
            '</div>' +
            '<nav class="app-nav">' +
              '<ul class="app-nav__list">' +
                buildNavigation(currentKey) +
              '</ul>' +
            '</nav>' +
          '</aside>' +
          '<main class="app-main">' +
            '<section class="app-page">' +
              '<header class="app-page__header">' +
                buildBreadcrumbs(currentKey) +
                '<h1 class="app-page__title">' + escapeHtml(title) + '</h1>' +
                (intro ? '<p class="app-page__intro">' + escapeHtml(intro) + '</p>' : '') +
              '</header>' +
              '<div class="app-page__body" id="app-page-body">' +
                pageContentHtml +
              '</div>' +
            '</section>' +
          '</main>' +
        '</div>' +
        '<footer class="app-footer">Created by <a href="mailto:s-daubney@newbury-college.ac.uk">Shaun Daubney</a></footer>' +
      '</div>';
  }

  function initAppShell() {
    const shellRoot = document.getElementById('app-shell');
    const pageTemplate = document.getElementById('app-page-content');

    if (!shellRoot || !pageTemplate) {
      console.warn('App shell could not initialise because #app-shell or #app-page-content is missing.');
      return;
    }

    shellRoot.innerHTML = createShell(pageTemplate.innerHTML);
    document.body.classList.add('app-shell-loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppShell);
  } else {
    initAppShell();
  }
})();
