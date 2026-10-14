// The 12-node / 16-edge / 3-group fixture the layout gates run on: a
// meal-kit context map with three deployables and one external system. Used
// by render-core.test.mjs (determinism, overlap, stability) and by
// smoke-render.mjs (the picture the driver looks at).

export const GRAPH = {
  nodes: [
    { id: 'storefront', label: 'Storefront', sublabel: 'supporting', kind: 'context' },
    { id: 'subscriptions', label: 'Subscriptions', sublabel: 'core domain', kind: 'context', tag: 'core' },
    { id: 'recommendations', label: 'Recommendations', sublabel: 'supporting', kind: 'context' },
    { id: 'accounts', label: 'Accounts', sublabel: 'generic', kind: 'context' },
    { id: 'menu-planning', label: 'Menu planning', sublabel: 'core domain', kind: 'context', tag: 'core' },
    { id: 'fulfilment', label: 'Fulfilment', sublabel: 'core domain', kind: 'context', tag: 'core' },
    { id: 'inventory', label: 'Inventory', sublabel: 'supporting', kind: 'context' },
    { id: 'delivery', label: 'Delivery', sublabel: 'supporting', kind: 'context' },
    { id: 'billing', label: 'Billing', sublabel: 'supporting', kind: 'context' },
    { id: 'payments', label: 'Payments', sublabel: 'generic', kind: 'context' },
    { id: 'ledger', label: 'Ledger', sublabel: 'generic', kind: 'context' },
    { id: 'stripe', label: 'Stripe', sublabel: 'external', kind: 'external' },
  ],
  edges: [
    { id: 'e01', from: 'storefront', to: 'subscriptions', kind: 'command', label: 'StartSubscription' },
    { id: 'e02', from: 'accounts', to: 'storefront', kind: 'query', label: 'profile' },
    { id: 'e03', from: 'recommendations', to: 'storefront', kind: 'query', label: 'weekly picks' },
    { id: 'e04', from: 'subscriptions', to: 'billing', kind: 'event', label: 'SubscriptionStarted' },
    { id: 'e05', from: 'subscriptions', to: 'menu-planning', kind: 'event', label: 'WeekConfirmed' },
    { id: 'e06', from: 'menu-planning', to: 'fulfilment', kind: 'command', label: 'PlanWeek' },
    { id: 'e07', from: 'fulfilment', to: 'inventory', kind: 'query', label: 'stock' },
    { id: 'e08', from: 'fulfilment', to: 'delivery', kind: 'command', label: 'DispatchBox' },
    { id: 'e09', from: 'billing', to: 'payments', kind: 'command', label: 'ChargeCustomer' },
    { id: 'e10', from: 'payments', to: 'stripe', kind: 'dependency' },
    { id: 'e11', from: 'payments', to: 'ledger', kind: 'event', label: 'PaymentTaken' },
    { id: 'e12', from: 'billing', to: 'subscriptions', kind: 'event', label: 'InvoiceUnpaid' },
    { id: 'e13', from: 'delivery', to: 'subscriptions', kind: 'event', label: 'BoxDelivered' },
    { id: 'e14', from: 'inventory', to: 'menu-planning', kind: 'event', label: 'StockLow' },
    { id: 'e15', from: 'accounts', to: 'billing', kind: 'query', label: 'billing address' },
    { id: 'e16', from: 'recommendations', to: 'menu-planning', kind: 'query', label: 'popular meals' },
  ],
  groups: [
    { id: 'customer-experience', label: 'Customer experience', sublabel: 'team Kitchen Table', kind: 'deployable', members: ['storefront', 'subscriptions', 'recommendations', 'accounts'] },
    { id: 'operations', label: 'Operations', sublabel: 'team Cold Chain', kind: 'deployable', members: ['menu-planning', 'fulfilment', 'inventory', 'delivery'] },
    { id: 'finance', label: 'Finance', sublabel: 'team Ledger', kind: 'deployable', members: ['billing', 'payments', 'ledger'] },
  ],
};

// The same graph with one leaf appended after a sink (ledger has no outgoing
// edges), which is the case the stability gate measures.
export function withLeaf(graph = GRAPH) {
  return {
    nodes: [...graph.nodes, { id: 'analytics', label: 'Analytics', sublabel: 'generic', kind: 'context' }],
    edges: [...graph.edges, { id: 'e17', from: 'ledger', to: 'analytics', kind: 'event', label: 'PaymentRecorded' }],
    groups: graph.groups.map((g) => ({ ...g, members: [...g.members] })),
  };
}

// Deep copy so a test can mutate freely.
export function fixture() {
  return JSON.parse(JSON.stringify(GRAPH));
}
