import { Screen, PageHeader } from '../components/Screen'

export default {
  title: 'Layout/Screen',
  component: Screen,
}

export const HomeTheme = {
  render: () => (
    <Screen theme="home">
      <PageHeader
        eyebrow="Portfolio"
        title="Holdings"
        subtitle="Paper account snapshot"
      />
      <p className="text-sm muted">Children inherit `--page-accent` from the screen theme.</p>
    </Screen>
  ),
}

export const MarketsTheme = {
  render: () => (
    <Screen theme="markets">
      <PageHeader eyebrow="Markets" title="Watchlist" />
    </Screen>
  ),
}
