import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are valid and not placeholders
export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url' && 
  supabaseAnonKey !== 'your_supabase_anon_key';

let supabaseClient = null;

if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

// -------------------------------------------------------------
// PERSISTENT LOCAL STORAGE MOCKS (For Offline Demo Mode)
// -------------------------------------------------------------
const initMockDB = () => {
  if (!localStorage.getItem('ems_mock_staff')) {
    localStorage.setItem('ems_mock_staff', JSON.stringify([
      { id: 'st-1', roblox_username: 'StaffRoblox', roblox_username_lower: 'staffroblox', display_name: 'Mythic Staff', active: true, note: 'Lead Moderator', created_at: new Date().toISOString() },
      { id: 'st-2', roblox_username: 'DevRoblox', roblox_username_lower: 'devroblox', display_name: 'Studio Developer', active: true, note: 'Lead Programmer', created_at: new Date().toISOString() }
    ]));
  }
  if (!localStorage.getItem('ems_mock_transactions')) {
    localStorage.setItem('ems_mock_transactions', JSON.stringify([
      {
        id: 'tx-1',
        order_code: 'EM-DEMO1234',
        roblox_username: 'NormalPlayer',
        roblox_username_lower: 'normalplayer',
        display_name: 'Standard Gamer',
        robux_amount: 1500,
        verification_status: 'Sudah',
        category: 'Normal',
        price_per_robux: 120,
        total_price: 180000,
        notes: 'Pintu gerbang premium',
        chat_channel: 'WhatsApp',
        payment_proof_path: 'mock-proofs/demo1.png',
        payment_proof_url: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=600',
        admin_status: 'completed',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        completed_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'tx-2',
        order_code: 'EM-DEMO9988',
        roblox_username: 'StaffRoblox',
        roblox_username_lower: 'staffroblox',
        display_name: 'Mythic Staff',
        robux_amount: 5000,
        verification_status: 'Sudah',
        category: 'Staff',
        price_per_robux: 100,
        total_price: 500000,
        notes: 'Mohon lekas diproses min',
        chat_channel: 'Discord',
        payment_proof_path: 'mock-proofs/demo2.png',
        payment_proof_url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600',
        admin_status: 'pending',
        created_at: new Date().toISOString()
      }
    ]));
  }
  if (!localStorage.getItem('ems_mock_settings')) {
    localStorage.setItem('ems_mock_settings', JSON.stringify({
      brand_name: 'Eternal Myth Studio',
      subtitle: 'Payout Community',
      whatsapp_number: '6281234567890',
      discord_url: 'https://discord.gg/eternalmyth',
      tiktok_url: 'https://www.tiktok.com/@eternalmyth'
    }));
  }
  if (!localStorage.getItem('ems_mock_session')) {
    localStorage.setItem('ems_mock_session', JSON.stringify(null));
  }
};

initMockDB();

// Mock query helpers
const getStaff = () => JSON.parse(localStorage.getItem('ems_mock_staff'));
const saveStaff = (data) => localStorage.setItem('ems_mock_staff', JSON.stringify(data));

const getTransactions = () => JSON.parse(localStorage.getItem('ems_mock_transactions'));
const saveTransactions = (data) => localStorage.setItem('ems_mock_transactions', JSON.stringify(data));

const getSettings = () => JSON.parse(localStorage.getItem('ems_mock_settings'));
const saveSettings = (data) => localStorage.setItem('ems_mock_settings', JSON.stringify(data));

const getSession = () => JSON.parse(localStorage.getItem('ems_mock_session'));
const saveSession = (data) => localStorage.setItem('ems_mock_session', JSON.stringify(data));

// -------------------------------------------------------------
// MOCK CLIENT DEFINITION
// -------------------------------------------------------------
const mockSupabase = {
  // Mock auth operations
  auth: {
    signInWithPassword: async ({ email, password }) => {
      // Allow any email ending with @eternalmyth.studio or admin/admin
      if (
        (email === 'admin@eternalmyth.studio' && password === 'admin123') ||
        (email === 'admin' && password === 'admin')
      ) {
        const mockUser = {
          id: 'auth-admin-uuid',
          email,
          role: 'authenticated',
          user_metadata: { full_name: 'System Admin' }
        };
        const mockSession = {
          access_token: 'mock-jwt-token-12345',
          user: mockUser
        };
        saveSession(mockSession);
        return { data: { user: mockUser, session: mockSession }, error: null };
      }
      return { data: { user: null, session: null }, error: new Error('Kredensial login admin tidak valid. Gunakan email "admin" dan sandi "admin".') };
    },
    signOut: async () => {
      saveSession(null);
      return { error: null };
    },
    getSession: async () => {
      const session = getSession();
      return { data: { session }, error: null };
    },
    onAuthStateChange: (callback) => {
      // Fire callback initially
      const session = getSession();
      callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      // Return subscription object
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
  },

  // Mock database queries
  from: (tableName) => {
    return {
      select: (selectColumns = '*') => {
        let list = [];
        if (tableName === 'staff_members') list = getStaff();
        else if (tableName === 'transactions') list = getTransactions();
        else if (tableName === 'app_settings') {
          // Format as rows of key, value pairs
          const settings = getSettings();
          list = Object.keys(settings).map(k => ({ key: k, value: settings[k] }));
        }

        // Return builder methods
        const builder = {
          order: (column, { ascending = true } = {}) => {
            const sorted = [...list].sort((a, b) => {
              const valA = a[column];
              const valB = b[column];
              if (valA < valB) return ascending ? -1 : 1;
              if (valA > valB) return ascending ? 1 : -1;
              return 0;
            });
            return Promise.resolve({ data: sorted, error: null });
          },
          eq: (column, value) => {
            const filtered = list.filter(item => {
              if (typeof item[column] === 'string' && typeof value === 'string') {
                return item[column].toLowerCase() === value.toLowerCase();
              }
              return item[column] === value;
            });
            return Promise.resolve({ data: filtered, error: null });
          },
          then: (resolve) => {
            resolve({ data: list, error: null });
          }
        };

        return builder;
      },

      insert: (rows) => {
        const rowArray = Array.isArray(rows) ? rows : [rows];
        let mockList = [];
        if (tableName === 'staff_members') {
          mockList = getStaff();
          const newRows = rowArray.map(r => ({
            id: 'st-' + Math.random().toString(36).substr(2, 9),
            active: r.active !== undefined ? r.active : true,
            created_at: new Date().toISOString(),
            roblox_username_lower: r.roblox_username.toLowerCase(),
            ...r
          }));
          mockList.push(...newRows);
          saveStaff(mockList);
          return Promise.resolve({ data: newRows, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },

      update: (fields) => {
        return {
          eq: (column, value) => {
            if (tableName === 'transactions') {
              const txs = getTransactions();
              const updated = txs.map(tx => {
                if (tx[column] === value) {
                  return {
                    ...tx,
                    ...fields,
                    completed_at: fields.admin_status === 'completed' ? new Date().toISOString() : tx.completed_at,
                    cancelled_at: fields.admin_status === 'cancelled' ? new Date().toISOString() : tx.cancelled_at
                  };
                }
                return tx;
              });
              saveTransactions(updated);
              return Promise.resolve({ data: updated.filter(t => t[column] === value), error: null });
            }
            if (tableName === 'staff_members') {
              const staff = getStaff();
              const updated = staff.map(st => {
                if (st[column] === value) {
                  return { ...st, ...fields };
                }
                return st;
              });
              saveStaff(updated);
              return Promise.resolve({ data: updated.filter(s => s[column] === value), error: null });
            }
            if (tableName === 'app_settings') {
              const settings = getSettings();
              if (column === 'key') {
                settings[value] = fields.value;
                saveSettings(settings);
                return Promise.resolve({ data: [{ key: value, value: fields.value }], error: null });
              }
            }
            return Promise.resolve({ data: [], error: null });
          }
        };
      },

      delete: () => {
        return {
          eq: (column, value) => {
            if (tableName === 'staff_members') {
              const staff = getStaff();
              const filtered = staff.filter(st => st[column] !== value);
              saveStaff(filtered);
              return Promise.resolve({ data: null, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          }
        };
      }
    };
  },

  // Mock functions (RPC)
  rpc: (funcName, args) => {
    if (funcName === 'get_order_quote') {
      const username = args.p_roblox_username || args.roblox_username || '';
      const robux = args.p_robux_amount !== undefined ? args.p_robux_amount : (args.robux_amount || 0);
      const lowerUser = username.toLowerCase();

      // Check staff members
      const staffList = getStaff();
      const isStaff = staffList.some(st => st.roblox_username_lower === lowerUser && st.active);

      // Check completed transactions
      const txList = getTransactions();
      const hasCompleted = txList.some(tx => tx.roblox_username_lower === lowerUser && tx.admin_status === 'completed');

      let category = 'Pembelian Pertama';
      let rate = 100;

      if (isStaff) {
        category = 'Staff';
        rate = 100;
      } else if (hasCompleted) {
        category = 'Normal';
        rate = 120;
      }

      const quote = {
        category,
        price_per_robux: rate,
        total_price: robux * rate
      };

      return Promise.resolve({ data: quote, error: null });
    }

    if (funcName === 'create_order') {
      const username = args.p_roblox_username || '';
      const robux = args.p_robux_amount || 0;
      const lowerUser = username.toLowerCase();

      // Get Quote
      const staffList = getStaff();
      const isStaff = staffList.some(st => st.roblox_username_lower === lowerUser && st.active);
      const txList = getTransactions();
      const hasCompleted = txList.some(tx => tx.roblox_username_lower === lowerUser && tx.admin_status === 'completed');

      let category = 'Pembelian Pertama';
      let rate = 100;

      if (isStaff) {
        category = 'Staff';
        rate = 100;
      } else if (hasCompleted) {
        category = 'Normal';
        rate = 120;
      }

      const total_price = robux * rate;
      const order_code = 'EM-' + Math.random().toString(36).substr(2, 8).toUpperCase();

      const newTx = {
        id: 'tx-' + Math.random().toString(36).substr(2, 9),
        order_code,
        roblox_username: username,
        roblox_username_lower: lowerUser,
        display_name: args.p_display_name,
        robux_amount: robux,
        verification_status: args.p_verification_status,
        category,
        price_per_robux: rate,
        total_price,
        notes: args.p_notes,
        chat_channel: args.p_chat_channel,
        payment_proof_path: args.p_payment_proof_path,
        payment_proof_url: args.p_payment_proof_url,
        admin_status: 'pending',
        created_at: new Date().toISOString()
      };

      const allTxs = getTransactions();
      allTxs.push(newTx);
      saveTransactions(allTxs);

      return Promise.resolve({ data: newTx, error: null });
    }

    return Promise.resolve({ data: null, error: new Error(`RPC function "${funcName}" not supported in mock client.`) });
  },

  // Mock Storage
  storage: {
    from: (bucketName) => {
      return {
        upload: async (filePath, fileObject) => {
          // Simulate short network delay
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Generate a fake url
          const fakeUrl = `https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=600&name=${encodeURIComponent(filePath)}`;
          return {
            data: { path: filePath },
            error: null
          };
        },
        getPublicUrl: (filePath) => {
          // Return a public url for rendering
          const fakeUrl = `https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=600&name=${encodeURIComponent(filePath)}`;
          return {
            data: { publicUrl: fakeUrl }
          };
        }
      };
    }
  }
};

export const supabase = isSupabaseConfigured ? supabaseClient : mockSupabase;
export default supabase;
