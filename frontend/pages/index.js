import { useStudioState } from '../hooks/useStudioState';
import Layout from '../components/Layout';

export default function Home() {
  const state = useStudioState();

  return <Layout state={state} />;
}
