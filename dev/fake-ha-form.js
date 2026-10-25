/* Dev only: a plain stand-in for Home Assistant's <ha-form> so the editor can be exercised without Home Assistant.
   It renders one plain input per schema item and fires value-changed like the real one. It does not look like HA. */
(() => {
  if (customElements.get('ha-form')) return;
  class FakeHaForm extends HTMLElement {
    set data(v) { this._data = Object.assign({}, v || {}); if (this._built) this._fill(); }
    get data() { return this._data || {}; }
    set schema(v) { this._schema = v || []; this._build(); }
    set hass(v) { this._hass = v; }
    _build() {
      this.innerHTML = ''; this._built = true;
      this.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px';
      this._inputs = {};
      (this._schema || []).forEach((s) => {
        const sel = s.selector || {}, lab = document.createElement('label');
        lab.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-size:12px;color:#5f6368';
        lab.textContent = this.computeLabel ? this.computeLabel(s) : s.name;
        let inp;
        if (sel.boolean) { inp = document.createElement('input'); inp.type = 'checkbox'; }
        else if (sel.select) { inp = document.createElement('select'); inp.innerHTML = '<option value=""></option>' + sel.select.options.map((o) => `<option>${o}</option>`).join(''); }
        else { inp = document.createElement('input'); inp.type = sel.number ? 'number' : 'text'; if (sel.entity) inp.placeholder = (sel.entity.domain || ['any']).join(', ') + (sel.entity.multiple ? ' (comma list)' : ''); }
        inp.dataset.name = s.name;
        inp.style.cssText = 'height:40px;border:1px solid #9e9e9e;border-radius:6px;padding:0 10px;font:inherit;font-size:13.5px;color:#212121';
        inp.addEventListener('change', () => this._changed(s, inp));
        lab.appendChild(inp); this.appendChild(lab); this._inputs[s.name] = { s, inp };
      });
      this._fill();
    }
    _fill() {
      Object.values(this._inputs || {}).forEach(({ s, inp }) => {
        const v = this.data[s.name];
        if (inp.type === 'checkbox') inp.checked = !!v;
        else inp.value = v == null ? '' : Array.isArray(v) ? v.join(', ') : v;
      });
    }
    _changed(s, inp) {
      const sel = s.selector || {}, d = Object.assign({}, this.data);
      let v = inp.type === 'checkbox' ? inp.checked : inp.value;
      if (sel.number) v = v === '' ? undefined : Number(v);
      if (sel.entity && sel.entity.multiple) v = String(v).split(',').map((x) => x.trim()).filter(Boolean);
      if (v === '' || (Array.isArray(v) && !v.length)) delete d[s.name]; else d[s.name] = v;
      this._data = d;
      this.dispatchEvent(new CustomEvent('value-changed', { detail: { value: d }, bubbles: true, composed: true }));
    }
  }
  customElements.define('ha-form', FakeHaForm);
})();
