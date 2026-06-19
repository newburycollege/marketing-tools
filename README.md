<h2>How to add another app</h2>
<ol>
 <li>Create a new HTML file using the same page structure.</li>
 <li>Set <code>data-app-key</code>, <code>data-app-title</code> and <code>data-app-intro</code> on the <code>&lt;body&gt;</code>.</li>
 <li>Put the page-specific markup inside <code>&lt;template id="app-page-content"&gt;</code>.</li>
 <li>Add one new item to the <code>navItems</code> array in <code>gds-shell.js</code>.</li>
</ol>
