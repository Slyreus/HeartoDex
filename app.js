const state = {
  species: [],
  filters: {
    types: new Set(),
    locations: new Set(),
    weather: new Set(),
    schedules: new Set(),
    query: ''
  }
};

const refs = {
  types: document.querySelector('#filter-types'),
  locations: document.querySelector('#filter-locations'),
  weather: document.querySelector('#filter-weather'),
  schedules: document.querySelector('#filter-schedules'),
  results: document.querySelector('#results'),
  resultsCount: document.querySelector('#resultsCount'),
  activeFilters: document.querySelector('#activeFilters'),
  template: document.querySelector('#species-card-template'),
  searchInput: document.querySelector('#searchInput'),
  locationSearchInput: document.querySelector('#locationSearchInput'),
  resetFilters: document.querySelector('#resetFilters')
};

const categoryLabels = {
  types: 'Type',
  locations: 'Zone',
  weather: 'Météo',
  schedules: 'Horaire'
};

const normalize = (value) => value.trim().toLowerCase();
const fold = (value) =>
  normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const locationChips = [];
const semanticTone = (kind, value) => {
  const v = fold(value);
  if (kind === 'types') {
    if (v.startsWith('oise')) return 'tone-type-bird';
    if (v.startsWith('insect')) return 'tone-type-insect';
    if (v.startsWith('poisson')) return 'tone-type-fish';
  }
  if (kind === 'weather') {
    if (v.includes('arc')) return 'tone-weather-rainbow';
    if (v.includes('pluie')) return 'tone-weather-rain';
    if (v.includes('soleil')) return 'tone-weather-sun';
  }
  if (kind === 'schedules') {
    if (v.includes('nuit')) return 'tone-schedule-night';
    if (v.includes('apres')) return 'tone-schedule-afternoon';
    if (v.includes('soir')) return 'tone-schedule-evening';
    if (v.includes('matin')) return 'tone-schedule-morning';
  }
  return null;
};

const applySemanticTone = (element, kind, value) => {
  const tone = semanticTone(kind, value);
  if (tone) {
    element.classList.add(tone);
  }
};

const buildFilterChips = (target, key, values) => {
  const uniqueValues = [...new Set(values)];
  target.innerHTML = '';

  uniqueValues.forEach((value) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.value = value;
    chip.dataset.kind = key;
    chip.textContent = value;
    applySemanticTone(chip, key, value);

    chip.addEventListener('click', () => {
      const bucket = state.filters[key];
      if (bucket.has(value)) {
        bucket.delete(value);
        chip.classList.remove('is-active');
      } else {
        bucket.add(value);
        chip.classList.add('is-active');
      }
      render();
    });

    target.appendChild(chip);
    if (key === 'locations') {
      locationChips.push({ value, chip });
    }
  });
};

const filterLocationChips = (query) => {
  const normalizedQuery = fold(query);
  locationChips.forEach(({ value, chip }) => {
    const visible =
      fold(value).includes(normalizedQuery) || state.filters.locations.has(value);
    chip.hidden = !visible;
  });
};

const matchesSetFilter = (selectedValues, candidateValues) => {
  if (selectedValues.size === 0) return true;
  return [...selectedValues].every((selected) => candidateValues.includes(selected));
};

const filterSpecies = () => {
  const query = normalize(state.filters.query);

  return state.species.filter((entry) => {
    const typeOk =
      state.filters.types.size === 0 || state.filters.types.has(entry.type);

    const locationOk =
      state.filters.locations.size === 0 || state.filters.locations.has(entry.location);

    const weatherOk = matchesSetFilter(state.filters.weather, entry.weather);
    const scheduleOk = matchesSetFilter(state.filters.schedules, entry.schedules);

    const searchOk =
      query.length === 0 ||
      normalize(entry.name).includes(query) ||
      normalize(entry.details).includes(query) ||
      normalize(entry.location).includes(query);

    return typeOk && locationOk && weatherOk && scheduleOk && searchOk;
  });
};

const renderActiveFilters = () => {
  refs.activeFilters.innerHTML = '';

  const chips = [];
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value instanceof Set) {
      value.forEach((entry) =>
        chips.push({
          label: `${categoryLabels[key]}: ${entry}`,
          key,
          value: entry
        })
      );
    }
  });

  if (state.filters.query.trim()) {
    chips.push({
      label: `Recherche: ${state.filters.query.trim()}`
    });
  }

  chips.forEach((item) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = item.label;
    if (item.key && item.value) {
      chip.dataset.kind = item.key;
      chip.dataset.value = item.value;
      applySemanticTone(chip, item.key, item.value);
    }
    refs.activeFilters.appendChild(chip);
  });
};

const renderBadgeList = (container, kind, values) => {
  container.textContent = '';
  values.forEach((value) => {
    const badge = document.createElement('span');
    badge.className = 'mini-badge';
    badge.dataset.kind = kind;
    badge.dataset.value = value;
    badge.textContent = value;
    applySemanticTone(badge, kind, value);
    container.appendChild(badge);
  });
};

const renderSpecies = (items) => {
  refs.results.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent =
      "Aucun résultat avec cette combinaison. Essaie de retirer un filtre ou d'élargir ta recherche.";
    refs.results.appendChild(empty);
    return;
  }

  items.forEach((entry) => {
    const clone = refs.template.content.cloneNode(true);
    const card = clone.querySelector('.species-card');
    card.dataset.type = entry.type;
    applySemanticTone(card, 'types', entry.type);
    clone.querySelector('.species-card__name').textContent = entry.name;
    clone.querySelector('.species-card__type-tag').textContent = entry.type;
    clone.querySelector('.species-card__location').textContent = entry.location;
    renderBadgeList(clone.querySelector('.species-card__weather'), 'weather', entry.weather);
    renderBadgeList(clone.querySelector('.species-card__schedule'), 'schedules', entry.schedules);
    clone.querySelector('.species-card__details-text').textContent = entry.details;
    refs.results.appendChild(clone);
  });
};

const render = () => {
  const filtered = filterSpecies();
  renderActiveFilters();
  renderSpecies(filtered);
  refs.resultsCount.textContent = `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`;
};

const resetFilters = () => {
  Object.values(state.filters).forEach((entry) => {
    if (entry instanceof Set) {
      entry.clear();
    }
  });
  state.filters.query = '';
  filterLocationChips('');

  document.querySelectorAll('.chip-grid .chip').forEach((chip) => {
    chip.classList.remove('is-active');
  });
  refs.searchInput.value = '';
  refs.locationSearchInput.value = '';
  render();
};

const init = async () => {
  const response = await fetch('./data/hearto-dex.json');
  const payload = await response.json();

  state.species = payload.species;

  buildFilterChips(refs.types, 'types', payload.meta.categories.types);
  buildFilterChips(refs.locations, 'locations', payload.meta.categories.locations);
  buildFilterChips(refs.weather, 'weather', payload.meta.categories.weather);
  buildFilterChips(refs.schedules, 'schedules', payload.meta.categories.schedules);

  refs.searchInput.addEventListener('input', (event) => {
    state.filters.query = event.target.value;
    render();
  });

  refs.locationSearchInput.addEventListener('input', (event) => {
    filterLocationChips(event.target.value);
  });

  refs.resetFilters.addEventListener('click', resetFilters);

  render();
};

init();
