package id.maztege.phonesecurity;

import android.app.*;
import android.os.*;
import android.content.*;
import android.content.pm.*;
import android.app.admin.DevicePolicyManager;
import android.net.*;
import android.provider.Settings;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.*;
import android.widget.*;
import java.util.*;

public class MainActivity extends Activity {
    private final int bg = Color.rgb(8,13,24), panel = Color.rgb(17,27,44), cyan = Color.rgb(0,210,255);
    private LinearLayout root, results;
    private TextView status, count;
    private int reviewed = 0, flagged = 0;
    private final ArrayList<String> findings = new ArrayList<>();

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().setStatusBarColor(bg);
        getWindow().setNavigationBarColor(bg);
        getWindow().getDecorView().setSystemUiVisibility(0);
        buildUi();
    }

    private GradientDrawable shape(int color, int radius) {
        GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(radius); return d;
    }
    private TextView text(String s, int size, int color, boolean bold) {
        TextView t = new TextView(this); t.setText(s); t.setTextSize(size); t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        t.setPadding(0, dp(5), 0, dp(5)); return t;
    }
    private int dp(int v) { return (int)(v * getResources().getDisplayMetrics().density + .5f); }
    private void buildUi() {
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true); scroll.setBackgroundColor(bg);
        root = new LinearLayout(this); root.setOrientation(1); root.setPadding(dp(20),dp(24),dp(20),dp(30));
        scroll.addView(root); setContentView(scroll);

        root.addView(text("MAZTEGE", 27, cyan, true));
        root.addView(text("PHONE SECURITY SCANNER", 14, Color.WHITE, true));
        root.addView(text("PEMERIKSAAN KEAMANAN ANDROID • OFFLINE", 10, Color.LTGRAY, false));
        LinearLayout hero = card(); hero.setOrientation(1);
        hero.addView(text("STATUS PERANGKAT",12,Color.LTGRAY,true));
        status = text("BELUM DIPERIKSA",23,Color.WHITE,true); hero.addView(status);
        count = text("Jalankan pemindaian untuk memeriksa konfigurasi dan aplikasi.",12,Color.LTGRAY,false); hero.addView(count);
        root.addView(hero);

        Button scan = button("MULAI PEMINDAIAN"); scan.setOnClickListener(v -> scanDevice()); root.addView(scan);
        root.addView(text("PEMERIKSAAN MANUAL",14,cyan,true));
        addSetting("Aksesibilitas","Periksa layanan yang memiliki kemampuan membaca layar dan mengendalikan tindakan.",Settings.ACTION_ACCESSIBILITY_SETTINGS);
        addSetting("Administrator perangkat","Lihat aplikasi yang diberi hak administrator.",Settings.ACTION_SECURITY_SETTINGS);
        addSetting("Akses aplikasi khusus","Tinjau izin akses khusus melalui pengaturan Android.",Settings.ACTION_MANAGE_APPLICATIONS_SETTINGS);
        addSetting("VPN","Periksa VPN yang sedang aktif.",Settings.ACTION_VPN_SETTINGS);
        addSetting("Privasi & izin","Tinjau izin kamera, mikrofon, lokasi, SMS, dan kontak.",Settings.ACTION_APPLICATION_DETAILS_SETTINGS, getPackageName());
        root.addView(text("HASIL PEMINDAIAN",14,cyan,true));
        results = new LinearLayout(this); results.setOrientation(1); root.addView(results);
        root.addView(text("BATAS PEMERIKSAAN",12,cyan,true));
        root.addView(text("Aplikasi ini memeriksa indikator yang dapat diakses Android. Hasil bersih TIDAK membuktikan ponsel bebas Pegasus. Spyware zero-click atau implant tingkat sistem dapat tidak terlihat oleh aplikasi biasa. Tidak ada file pribadi, pesan, foto, atau isi WhatsApp yang dibaca atau dikirim.",12,Color.LTGRAY,false));
        root.addView(text("Semua pemeriksaan dilakukan lokal di perangkat. Aplikasi tidak membutuhkan internet.",11,Color.GRAY,false));
    }
    private LinearLayout card() {
        LinearLayout c = new LinearLayout(this); c.setOrientation(1); c.setPadding(dp(16),dp(14),dp(16),dp(14));
        c.setBackground(shape(panel,dp(16))); LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1,-2); p.setMargins(0,dp(18),0,dp(14)); c.setLayoutParams(p); return c;
    }
    private Button button(String s) {
        Button b = new Button(this); b.setText(s); b.setTextColor(Color.BLACK); b.setTextSize(14); b.setTypeface(null,Typeface.BOLD);
        b.setBackground(shape(cyan,dp(14))); b.setAllCaps(false);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1,dp(54)); p.setMargins(0,dp(10),0,dp(18)); b.setLayoutParams(p); return b;
    }
    private void addSetting(String title, String desc, String action) { addSetting(title,desc,action,null); }
    private void addSetting(String title, String desc, String action, String data) {
        LinearLayout c = card(); c.addView(text(title,16,Color.WHITE,true)); c.addView(text(desc,11,Color.LTGRAY,false));
        c.setOnClickListener(v -> { try { Intent i = new Intent(action); if (data != null) i.setData(android.net.Uri.parse("package:"+data)); startActivity(i); } catch(Exception e) { Toast.makeText(this,"Menu tidak tersedia pada perangkat ini",Toast.LENGTH_SHORT).show(); } });
        root.addView(c);
    }
    private void addFinding(String title, String detail, boolean warning) {
        LinearLayout c = card(); c.addView(text((warning ? "PERLU DITINJAU  •  " : "INFO  •  ")+title,14,warning?Color.rgb(255,190,70):cyan,true));
        c.addView(text(detail,12,Color.LTGRAY,false)); results.addView(c);
    }

    private void scanDevice() {
        results.removeAllViews(); findings.clear(); reviewed=0; flagged=0;
        status.setText("MEMINDAI…"); status.setTextColor(cyan);
        try {
            PackageManager pm = getPackageManager();
            List<PackageInfo> apps = pm.getInstalledPackages(PackageManager.GET_PERMISSIONS | PackageManager.GET_SERVICES | PackageManager.GET_META_DATA);
            String[] sensitive = {"android.permission.RECORD_AUDIO","android.permission.CAMERA","android.permission.ACCESS_FINE_LOCATION","android.permission.ACCESS_COARSE_LOCATION","android.permission.READ_SMS","android.permission.SEND_SMS","android.permission.READ_CALL_LOG","android.permission.READ_CONTACTS","android.permission.READ_PHONE_STATE","android.permission.READ_EXTERNAL_STORAGE","android.permission.MANAGE_EXTERNAL_STORAGE"};
            for (PackageInfo pi : apps) {
                if (pi.applicationInfo == null) continue;
                reviewed++;
                ArrayList<String> granted = new ArrayList<>();
                if (pi.requestedPermissions != null && pi.requestedPermissionsFlags != null) {
                    for (int i=0;i<pi.requestedPermissions.length;i++) {
                        if ((pi.requestedPermissionsFlags[i] & PackageInfo.REQUESTED_PERMISSION_GRANTED) != 0) {
                            for (String s : sensitive) if (s.equals(pi.requestedPermissions[i])) granted.add(s.replace("android.permission.",""));
                        }
                    }
                }
                boolean system = (pi.applicationInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
                if (!system && !granted.isEmpty()) {
                    flagged++;
                    String label;
                    try { label = pm.getApplicationLabel(pi.applicationInfo).toString(); } catch(Exception e) { label=pi.packageName; }
                    String perms = String.join(", ",granted);
                    addFinding(label, "Paket: "+pi.packageName+"\nIzin sensitif yang diberikan: "+perms+"\nIni bukan bukti spyware. Pastikan izin sesuai fungsi aplikasi.", true);
                }
            }
            DevicePolicyManager dpm = (DevicePolicyManager)getSystemService(DEVICE_POLICY_SERVICE);
            List<ComponentName> admins = dpm.getActiveAdmins();
            if (admins != null && !admins.isEmpty()) {
                flagged++;
                for (ComponentName c : admins) addFinding("Administrator perangkat aktif", c.getPackageName()+" memiliki hak administrator perangkat. Periksa apakah Anda mengenal aplikasi ini.", true);
            } else addFinding("Administrator perangkat", "Tidak ditemukan administrator perangkat aktif.", false);

            String enabled = Settings.Secure.getString(getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            if (enabled != null && !enabled.trim().isEmpty()) {
                String[] services = enabled.split(":");
                for (String service : services) {
                    if (!service.trim().isEmpty()) {
                        flagged++;
                        addFinding("Layanan aksesibilitas aktif", service+" — pastikan Anda mengenali layanan ini. Aksesibilitas juga digunakan aplikasi sah.", true);
                    }
                }
            } else addFinding("Aksesibilitas", "Tidak ada layanan aksesibilitas pihak ketiga yang terdaftar aktif.", false);

            ConnectivityManager cm = (ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);
            Network n = cm.getActiveNetwork(); NetworkCapabilities caps = n==null?null:cm.getNetworkCapabilities(n);
            boolean vpn = caps!=null && caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN);
            addFinding("Koneksi VPN", vpn?"VPN sedang aktif. Periksa nama penyedia dan apakah Anda mengaktifkannya.":"Tidak terdeteksi koneksi VPN aktif saat pemindaian.", vpn);

            KeyguardManager km = (KeyguardManager)getSystemService(KEYGUARD_SERVICE);
            boolean secureLock = km != null && km.isDeviceSecure();
            addFinding("Kunci layar", secureLock ? "PIN, pola, atau sandi layar terdeteksi aktif." : "Tidak terdeteksi PIN, pola, atau sandi layar. Aktifkan kunci layar yang kuat.", !secureLock);

            boolean adb = Settings.Global.getInt(getContentResolver(), Settings.Global.ADB_ENABLED, 0) == 1;
            boolean dev = Settings.Global.getInt(getContentResolver(), Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1;
            addFinding("USB debugging", adb ? "USB debugging aktif. Matikan jika tidak sedang digunakan." : "USB debugging tidak aktif.", adb);
            addFinding("Opsi pengembang", dev ? "Opsi pengembang aktif. Periksa pengaturan yang Anda ubah." : "Opsi pengembang tidak aktif.", false);

            addFinding("Versi Android & patch", "Android "+Build.VERSION.RELEASE+" (API "+Build.VERSION.SDK_INT+") • Patch keamanan: "+Build.VERSION.SECURITY_PATCH, false);
            addFinding("Inventaris aplikasi", reviewed+" paket terpasang diperiksa. "+flagged+" temuan perlu ditinjau.", false);

            status.setText(flagged==0?"TIDAK ADA INDIKATOR YANG DITEMUKAN":"ADA "+flagged+" TEMUAN UNTUK DITINJAU");
            status.setTextColor(flagged==0?Color.rgb(90,230,160):Color.rgb(255,190,70));
            count.setText("Paket diperiksa: "+reviewed+" • Temuan: "+flagged+"\nHasil ini bukan sertifikasi bebas Pegasus.");
        } catch(Exception e) {
            status.setText("PEMINDAIAN TIDAK LENGKAP");
            count.setText("Android membatasi sebagian informasi: "+e.getClass().getSimpleName());
            addFinding("Pemeriksaan terhenti", "Coba ulangi dan pastikan versi Android mendukung pemeriksaan ini.", true);
        }
    }
}
