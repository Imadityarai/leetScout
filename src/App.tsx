import { useEffect, useMemo, useState } from 'react';
import { loadProblems } from './api';
import type { Difficulty, Problem } from './types';

type SortOrder = 'rating-asc' | 'rating-desc' | 'title';

const difficulties: Array<'All' | Difficulty> = ['All', 'Easy', 'Medium', 'Hard'];

function App() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<
    'cache' | 'fresh' | 'published' | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryMatchMode, setCategoryMatchMode] = useState<'soft' | 'hard'>(
    'soft',
  );
  const [difficulty, setDifficulty] = useState<'All' | Difficulty>('All');
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('rating-desc');
  const [visibleCount, setVisibleCount] = useState(100);
  const [pickedProblem, setPickedProblem] = useState<Problem | null>(null);


  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    loadProblems(controller.signal)
      .then(({ problems: loadedProblems, source }) => {
        setProblems(loadedProblems);
        setDataSource(source);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : 'Unable to load the problem library.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [reloadKey]);

  const categories = useMemo(
    () =>
      [...new Set(problems.flatMap((problem) => problem.topicTags.map((tag) => tag.name)))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [problems],
  );
  const visibleCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    return query
      ? categories.filter((category) => category.toLowerCase().includes(query))
      : categories;
  }, [categories, categorySearch]);

  const filteredProblems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const minimum = minRating === '' ? null : Number(minRating);
    const maximum = maxRating === '' ? null : Number(maxRating);

    return problems
      .filter((problem) => {
        const matchesSearch =
          !query ||
          problem.title.toLowerCase().includes(query) ||
          problem.frontendQuestionId.includes(query);

        const problemCategories = new Set(problem.topicTags.map((tag) => tag.name));
        const matchesCategory =
          selectedCategories.length === 0 ||
          (categoryMatchMode === 'hard'
            ? problemCategories.size === selectedCategories.length &&
              selectedCategories.every((category) => problemCategories.has(category))
            : selectedCategories.every((category) => problemCategories.has(category)));

        const matchesDifficulty =
          difficulty === 'All' || problem.difficulty === difficulty;

        const matchesMinimum =
          minimum === null || (problem.rating !== null && problem.rating >= minimum);

        const matchesMaximum =
          maximum === null || (problem.rating !== null && problem.rating <= maximum);

        return (
          matchesSearch &&
          matchesCategory &&
          matchesDifficulty &&
          matchesMinimum &&
          matchesMaximum
        );
      })
      .sort((a, b) => {
        if (sortOrder === 'title') {
          return a.title.localeCompare(b.title);
        }

        if (a.rating === null) return 1;
        if (b.rating === null) return -1;

        return sortOrder === 'rating-asc'
          ? a.rating - b.rating
          : b.rating - a.rating;
      });
  }, [
    problems,
    search,
    selectedCategories,
    categoryMatchMode,
    difficulty,
    minRating,
    maxRating,
    sortOrder,
  ]);

  useEffect(() => {
    setVisibleCount(100);
  }, [
    search,
    selectedCategories,
    categoryMatchMode,
    difficulty,
    minRating,
    maxRating,
    sortOrder,
  ]);

  const ratedCount = useMemo(
    () => problems.filter((problem) => problem.rating !== null).length,
    [problems],
  );

  function pickProblem() {
    if (!filteredProblems.length) {
      return;
    }

    const index = Math.floor(Math.random() * filteredProblems.length);
    setPickedProblem(filteredProblems[index]);
  }

  function resetFilters() {
    setSearch('');
    setSelectedCategories([]);
    setCategoryMatchMode('soft');
    setDifficulty('All');
    setMinRating('');
    setMaxRating('');
    setSortOrder('rating-desc');
    setPickedProblem(null);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="LeetCode Scout home">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span>
            leet<span className="brand-accent">scout</span>
          </span>
        </a>

        <div className="topbar-right">
          <span className="live-indicator">
            <i /> Live problem data
          </span>
          <a
            className="top-link"
            href="https://leetcode.com/problemset/"
            target="_blank"
            rel="noreferrer"
          >
            LeetCode ↗
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> YOUR NEXT CHALLENGE STARTS HERE
            </p>
            <h1>
              Find the right
              <br />
              <span>problem to solve.</span>
            </h1>
            <p className="hero-description">
              Explore LeetCode by topic and community rating. Choose an exact challenge
              profile and improve with intention.
            </p>
            <div className="hero-meta">
              <span>
                <b>01</b> Choose a topic
              </span>
              <span className="meta-divider">/</span>
              <span>
                <b>02</b> Set your level
              </span>
              <span className="meta-divider">/</span>
              <span>
                <b>03</b> Start solving
              </span>
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <div className="orbit-core">
              <span>&lt;/&gt;</span>
            </div>
            <span className="float-chip chip-top">O(log n)</span>
            <span className="float-chip chip-left">0101</span>
            <span className="float-chip chip-right">#42</span>
            <span className="float-chip chip-bottom">solve()</span>
          </div>
        </section>

        <section className="stats-row" aria-label="Problem library overview">
          <div className="stat-item">
            <span className="stat-icon stat-orange">▤</span>
            <div>
              <strong>{loading ? '—' : problems.length.toLocaleString()}</strong>
              <small>Problems indexed</small>
            </div>
          </div>
          <span className="stat-separator" />
          <div className="stat-item">
            <span className="stat-icon stat-violet">⌘</span>
            <div>
              <strong>{loading ? '—' : categories.length}</strong>
              <small>Topics to explore</small>
            </div>
          </div>
          <span className="stat-separator" />
          <div className="stat-item">
            <span className="stat-icon stat-green">↗</span>
            <div>
              <strong>{loading ? '—' : ratedCount.toLocaleString()}</strong>
              <small>Problems with ratings</small>
            </div>
          </div>
          <div className="stats-note">
            <span className="pulse-dot" />
            {dataSource === null
              ? 'Loading problem data'
              : dataSource === 'published'
                ? 'Loaded from published dataset'
                : dataSource === 'cache'
                  ? 'Loaded from assets database'
                  : 'Fetched and saved to assets'}
          </div>
        </section>

        <section className="workspace">
          <aside className="filter-panel">
            <div className="panel-heading">
              <div>
                <span className="heading-kicker">MAKE IT YOURS</span>
                <h2>Filters</h2>
              </div>
              <button className="reset-button" type="button" onClick={resetFilters}>
                Reset
              </button>
            </div>

            <label className="field-label" htmlFor="search">
              Search problems
            </label>
            <div className="search-field">
              <span aria-hidden="true">⌕</span>
              <input
                id="search"
                type="search"
                placeholder="Name or problem number"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="topic-filter spaced-label">
              <span className="field-label">Topic categories</span>
              <details className="topic-picker">
                <summary aria-label="Select one or more topic categories">
                  <span>
                    {selectedCategories.length === 0
                      ? 'All topics'
                      : `${selectedCategories.length} selected`}
                  </span>
                  <span className="topic-picker-chevron" aria-hidden="true">⌄</span>
                </summary>
                {!loading && categories.length > 0 && (
                  <div className="topic-menu">
                    <div className="topic-menu-heading">
                      <span>Select topics</span>
                      {selectedCategories.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedCategories([])}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <label className="category-search">
                      <span aria-hidden="true">⌕</span>
                      <input
                        type="search"
                        aria-label="Search categories"
                        placeholder="Search categories"
                        value={categorySearch}
                        onChange={(event) => setCategorySearch(event.target.value)}
                      />
                    </label>
                    {visibleCategories.map((topic) => (
                      <label className="topic-choice" key={topic}>
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(topic)}
                          onChange={(event) => {
                            setSelectedCategories((current) =>
                              event.target.checked
                                ? [...current, topic]
                                : current.filter((selected) => selected !== topic),
                            );
                          }}
                        />
                        <span>{topic}</span>
                      </label>
                    ))}
                    {visibleCategories.length === 0 && (
                      <p className="no-category-results">No matching categories.</p>
                    )}
                  </div>
                )}
              </details>
              {selectedCategories.length > 0 && (
                <div className="selected-topics" aria-label="Selected topics">
                  {selectedCategories.map((topic) => (
                    <button
                      className="selected-topic"
                      key={topic}
                      type="button"
                      aria-label={`Remove ${topic} filter`}
                      onClick={() =>
                        setSelectedCategories((current) =>
                          current.filter((selected) => selected !== topic),
                        )
                      }
                    >
                      {topic} <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="category-match-control">
                <span className="field-label">Category matching</span>
                <div
                  className="category-match-options"
                  role="group"
                  aria-label="Category matching mode"
                >
                  <button
                    className={`category-match-option ${
                      categoryMatchMode === 'soft' ? 'selected' : ''
                    }`}
                    type="button"
                    aria-pressed={categoryMatchMode === 'soft'}
                    onClick={() => setCategoryMatchMode('soft')}
                  >
                    Soft
                  </button>
                  <button
                    className={`category-match-option ${
                      categoryMatchMode === 'hard' ? 'selected' : ''
                    }`}
                    type="button"
                    aria-pressed={categoryMatchMode === 'hard'}
                    onClick={() => setCategoryMatchMode('hard')}
                  >
                    Hard
                  </button>
                </div>
                <p className="category-match-help">
                  {categoryMatchMode === 'hard'
                    ? 'A problem must have exactly the selected categories.'
                    : 'A problem must include every selected category; extra categories are allowed.'}
                </p>
              </div>
            </div>

            <fieldset className="difficulty-field">
              <legend className="field-label">Difficulty</legend>
              <div className="difficulty-options">
                {difficulties.map((level) => (
                  <button
                    className={`difficulty-option ${difficulty === level ? 'selected' : ''} ${
                      level === 'All' ? 'all' : level.toLowerCase()
                    }`}
                    key={level}
                    type="button"
                    aria-pressed={difficulty === level}
                    onClick={() => setDifficulty(level)}
                  >
                    {level === 'All' ? 'All' : level}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="rating-heading">
              <span className="field-label">Rating range</span>
              <span className="rating-scale">ELO</span>
            </div>
            <div className="rating-inputs">
              <label>
                <span>MIN</span>
                <input
                  type="number"
                  min="0"
                  max="4000"
                  placeholder="Any"
                  value={minRating}
                  onChange={(event) => setMinRating(event.target.value)}
                  aria-label="Minimum rating"
                />
              </label>
              <span className="range-dash">—</span>
              <label>
                <span>MAX</span>
                <input
                  type="number"
                  min="0"
                  max="4000"
                  placeholder="Any"
                  value={maxRating}
                  onChange={(event) => setMaxRating(event.target.value)}
                  aria-label="Maximum rating"
                />
              </label>
            </div>
            <p className="filter-hint">
              Rating bounds are inclusive. Problems without a rating are excluded when a bound is set.
            </p>

            <div className="filter-footer">
              <span className="filter-footer-icon">✳</span>
              <p>
                Ratings are contest-based estimates and not official LeetCode labels.
              </p>
            </div>
          </aside>

          <section className="results-panel" aria-label="Filtered problems">
            <div className="results-header">
              <div>
                <span className="heading-kicker">THE PROBLEM LIBRARY</span>
                <h2>
                  Explore problems{' '}
                  <span className="result-count">
                    {loading ? '…' : filteredProblems.length}
                  </span>
                </h2>
                <p className="results-subtitle">
                  A good challenge is closer than you think.
                </p>
              </div>

              <div className="results-actions">
                <label className="sort-control">
                  <span>Sort by</span>
                  <select
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                  >
                    <option value="rating-desc">Rating: high to low</option>
                    <option value="rating-asc">Rating: low to high</option>
                    <option value="title">Problem name</option>
                  </select>
                </label>
                <button
                  className="pick-button"
                  type="button"
                  onClick={pickProblem}
                  disabled={loading || filteredProblems.length === 0}
                >
                  <span aria-hidden="true">✦</span> Pick for me
                </button>
              </div>
            </div>

            {error && (
              <div className="error-state" role="alert">
                <div className="error-symbol">!</div>
                <div>
                  <strong>Couldn’t load the problem library</strong>
                  <p>{error}</p>
                  <p className="error-detail">
                    Check your connection and try again. LeetCode’s official problem-set
                    endpoint can be unavailable or blocked by CORS.
                  </p>
                </div>
                <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
                  Try again
                </button>
              </div>
            )}

            {loading && !error && (
              <div className="loading-state" role="status">
                <span className="loading-spinner" />
                <strong>Gathering problems for you</strong>
                <span>Loading topic data and community ratings…</span>
              </div>
            )}

            {!loading && !error && filteredProblems.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon">⌕</span>
                <strong>No problems match those filters</strong>
                <p>Try widening the rating range or resetting your filters.</p>
                <button type="button" className="text-button" onClick={resetFilters}>
                  Clear all filters
                </button>
              </div>
            )}

            {!loading && !error && filteredProblems.length > 0 && (
              <div className="problem-list">
                {pickedProblem &&
                  filteredProblems.some(
                    (problem) => problem.titleSlug === pickedProblem.titleSlug,
                  ) && (
                    <article className="picked-card">
                      <span className="picked-sparkle">✦</span>
                      <div className="picked-copy">
                        <span className="picked-label">YOUR RANDOM PICK</span>
                        <a
                          href={`https://leetcode.com/problems/${pickedProblem.titleSlug}/`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {pickedProblem.title} <span>↗</span>
                        </a>
                        <small>
                          #{pickedProblem.frontendQuestionId} · {pickedProblem.difficulty} ·{' '}
                          {pickedProblem.rating === null
                            ? 'No rating yet'
                            : `Rating ${Math.round(pickedProblem.rating)}`}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="dismiss-pick"
                        aria-label="Dismiss recommendation"
                        onClick={() => setPickedProblem(null)}
                      >
                        ×
                      </button>
                    </article>
                  )}

                {filteredProblems.slice(0, visibleCount).map((problem) => (
                  <ProblemRow key={problem.titleSlug} problem={problem} />
                ))}

                {filteredProblems.length > visibleCount && (
                  <div className="list-pagination">
                    <p className="list-limit">
                      Showing {visibleCount} of {filteredProblems.length} matching problems.
                    </p>
                    <button
                      className="show-more-button"
                      type="button"
                      onClick={() => setVisibleCount((count) => count + 100)}
                    >
                      Show more problems
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </section>

        <footer className="page-footer">
          <span>
            MADE FOR THE DAILY GRIND <b>·</b> NOT AFFILIATED WITH LEETCODE
          </span>
          <span>
            Problem ratings by{' '}
            <a href="https://zerotrac.github.io/leetcode_problem_rating/" target="_blank" rel="noreferrer">
              zerotrac
            </a>
          </span>
        </footer>
      </main>
    </div>
  );
}

function ProblemRow({ problem }: { problem: Problem }) {
  return (
    <article className="problem-row">
      <div className="problem-number">#{problem.frontendQuestionId}</div>
      <div className="problem-main">
        <a
          className="problem-title"
          href={`https://leetcode.com/problems/${problem.titleSlug}/`}
          target="_blank"
          rel="noreferrer"
        >
          {problem.title}
          <span className="external-arrow">↗</span>
        </a>
        <div className="topic-tags">
          {problem.topicTags.slice(0, 3).map((tag) => (
            <span className="topic-tag" key={tag.slug}>
              {tag.name}
            </span>
          ))}
          {problem.topicTags.length > 3 && (
            <span className="more-tags">+{problem.topicTags.length - 3}</span>
          )}
        </div>
      </div>
      <span className={`difficulty-badge ${problem.difficulty.toLowerCase()}`}>
        {problem.difficulty}
      </span>
      <div className="rating-cell">
        <span className="rating-value">
          {problem.rating === null ? '—' : Math.round(problem.rating)}
        </span>
        <span className="rating-caption">
          {problem.rating === null ? 'unrated' : 'rating'}
        </span>
      </div>
    </article>
  );
}

export default App;
