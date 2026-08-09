import { BrandMark, BrandLockup } from '../components/Brand'

export default {
  title: 'Brand/Mark',
  component: BrandMark,
}

export const Mark = {
  args: { size: 48 },
}

export const LockupDark = {
  render: () => <BrandLockup size="md" tone="dark" />,
}

export const LockupLight = {
  render: () => (
    <div style={{ background: '#0B1B33', padding: 24, borderRadius: 12 }}>
      <BrandLockup size="lg" tone="light" />
    </div>
  ),
}
