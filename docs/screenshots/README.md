# Screenshots for Documentation

This directory contains screenshots referenced in the main README's Usage Guide section.

## Required Screenshots

Please add the following screenshots to this directory:

1. **dashboard-overview.png**
   - Full dashboard view showing both network graph and search panel
   - Should show the initial state when user opens the app

2. **network-graph.png**
   - Focused view of the network graph
   - Show nodes with different colors (users, tweets, hashtags)
   - Display some connections between nodes

3. **user-search.png**
   - Search panel with "Users" tab selected
   - Show search results for a user query
   - Display user cards with profile info

4. **hashtag-search.png**
   - Search panel with "Hashtags" tab selected
   - Show search results for hashtag query
   - Display hashtag statistics

5. **tweet-search.png**
   - Tweets tab showing semantic search
   - Show query input and semantic search results
   - Display "Powered by AI Semantic Search" indicator

6. **ai-query.png**
   - AI Query mode active
   - Show natural language question and results
   - Display generated Cypher query if visible

8. **user-details.png**
   - Detailed view of a selected user
   - Show profile info, stats, and network connections

9. **tweet-details.png**
   - Detailed view of a selected tweet
   - Show tweet content, author, and metadata

10. **hashtag-details.png**
    - Detailed view of a selected hashtag
    - Show usage stats and related tweets

11. **filters.png**
    - Filter panel below the network graph
    - Show various filter controls (follower range, activity, etc.)

## Screenshot Guidelines

- **Resolution**: 1920x1080 or higher (can be scaled down in documentation)
- **Format**: PNG format recommended for clarity
- **Content**: Use demo data already in the app
- **UI State**: Show active/in-use states where applicable
- **Annotations**: Optional red boxes or arrows to highlight key features

## Example Screenshot Names

```
docs/screenshots/
├── dashboard-overview.png
├── network-graph.png
├── user-search.png
├── hashtag-search.png
├── tweet-search-modes.png
├── semantic-search.png
├── ai-query.png
├── user-details.png
├── tweet-details.png
├── hashtag-details.png
├── filters.png
└── theme-toggle.png
```

## Tips

- Take screenshots on a clean browser window without extensions/bookmarks visible
- Ensure the app is in a good visual state (not loading/error states)
- Use actual data from the dashboard for authenticity
- Consider showing both dark and light themes for theme-toggle.png
