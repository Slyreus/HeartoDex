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
  resetFilters: document.querySelector('#resetFilters')
};

const categoryLabels = {
  types: 'Type',
  locations: 'Zone',
  weather: 'Météo',
  schedules: 'Horaire'
};

const normalize = (value) => value.trim().toLowerCase();

const buildFilterChips = (target, key, values) => {
  const uniqueValues = [...new Set(values)];
  target.innerHTML = '';

  uniqueValues.forEach((value) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.value = value;
    chip.textContent = value;

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
      value.forEach((entry) => chips.push(`${categoryLabels[key]}: ${entry}`));
    }
  });

  if (state.filters.query.trim()) {
    chips.push(`Recherche: ${state.filters.query.trim()}`);
  }

  chips.forEach((item) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = item;
    refs.activeFilters.appendChild(chip);
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
    clone.querySelector('.species-card__name').textContent = entry.name;
    clone.querySelector('.species-card__type-tag').textContent = entry.type;
    clone.querySelector('.species-card__location').textContent = entry.location;
    clone.querySelector('.species-card__weather').textContent = entry.weather.join(', ');
    clone.querySelector('.species-card__schedule').textContent = entry.schedules.join(', ');
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

  document.querySelectorAll('.chip-grid .chip').forEach((chip) => {
    chip.classList.remove('is-active');
  });
  refs.searchInput.value = '';
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

  refs.resetFilters.addEventListener('click', resetFilters);

  render();
};

init();
