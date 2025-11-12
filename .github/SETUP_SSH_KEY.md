# 🔐 วิธีสร้าง SSH Key สำหรับ Bitbucket

## Step 1: สร้าง SSH Key Pair

```bash
# สร้าง SSH key แบบ ED25519 (แนะนำ - เร็วและปลอดภัย)
ssh-keygen -t ed25519 -C "github-actions@flexboard" -f ~/.ssh/bitbucket_flexboard -N ""

# หรือใช้ RSA (ถ้า Bitbucket ไม่รองรับ ED25519)
ssh-keygen -t rsa -b 4096 -C "github-actions@flexboard" -f ~/.ssh/bitbucket_flexboard -N ""
```

จะได้ไฟล์ 2 ไฟล์:

- `~/.ssh/bitbucket_flexboard` → **Private key** (ใช้ใน GitHub Secrets)
- `~/.ssh/bitbucket_flexboard.pub` → **Public key** (เพิ่มใน Bitbucket)

---

## Step 2: เพิ่ม Public Key ไปที่ Bitbucket

### Option A: เพิ่มแบบ Repository Access Key (แนะนำ)

1. Copy public key:

```bash
cat ~/.ssh/bitbucket_flexboard.pub
```

2. ไปที่ Bitbucket repository (ทำทั้ง 3 repos):

   - **flexb-backend**
   - **flexb-frontend**
   - **flexb-onprem**

3. ไปที่: **Repository settings** → **Access keys** → **Add key**

4. Paste public key และตั้งชื่อ: `github-actions-deploy`

5. ✅ เลือก **Write access** (เพื่อให้ push ได้)

### Option B: เพิ่มแบบ Personal SSH Key (ใช้ได้ทุก repo ของคุณ)

1. Copy public key:

```bash
cat ~/.ssh/bitbucket_flexboard.pub
```

2. ไปที่ Bitbucket: **Personal settings** → **SSH keys** → **Add key**

3. Paste public key และตั้งชื่อ: `GitHub Actions`

---

## Step 3: เพิ่ม Private Key ใน GitHub Secrets

1. Copy private key (**ระวัง! อย่าแชร์ไฟล์นี้**):

```bash
cat ~/.ssh/bitbucket_flexboard
```

2. ไปที่ GitHub repository:

   - **Settings** → **Secrets and variables** → **Actions**

3. Click **New repository secret**:
   - **Name**: `BITBUCKET_SSH_KEY`
   - **Value**: Paste ทั้งหมดจากไฟล์ private key (รวม `-----BEGIN ... KEY-----`)

---

## Step 4: ทดสอบ SSH Connection

```bash
# ทดสอบว่า SSH key ใช้งานได้
ssh -T git@bitbucket.org -i ~/.ssh/bitbucket_flexboard

# ควรเห็น output:
# authenticated via ssh key.
# You can use git to connect to Bitbucket. Shell access is disabled
```

---

## Step 5: ทดสอบ GitHub Actions Workflow

### วิธีที่ 1: Push เข้า branch main/dev/staging

```bash
# สมมติว่าอยู่ใน branch dev
git add .
git commit -m "Test Bitbucket sync workflow"
git push origin dev
```

### วิธีที่ 2: Trigger Manual Workflow

1. ไปที่ GitHub repository
2. **Actions** tab → **Sync to Bitbucket**
3. Click **Run workflow** → เลือก branch → **Run workflow**

---

## 📋 Checklist

- [ ] สร้าง SSH key pair แล้ว
- [ ] เพิ่ม public key ใน Bitbucket (ทั้ง 3 repos)
- [ ] เพิ่ม private key ใน GitHub Secrets (`BITBUCKET_SSH_KEY`)
- [ ] ทดสอบ SSH connection สำเร็จ
- [ ] Push ทดสอบครั้งแรกด้วย manual script: `./push-to-bitbucket.sh`
- [ ] ทดสอบ GitHub Actions workflow

---

## 🔒 Security Best Practices

1. **ห้าม commit private key** ใน repository
2. ใช้ **Repository Access Keys** แทน Personal SSH key ถ้าเป็นไปได้
3. ตั้ง **Read-only** ถ้าไม่ต้องการให้ push (แต่งานนี้ต้อง Write)
4. ลบ SSH key ออกจากเครื่องหลังเพิ่มใน GitHub Secrets:
   ```bash
   rm ~/.ssh/bitbucket_flexboard
   rm ~/.ssh/bitbucket_flexboard.pub
   ```

---

## ❓ Troubleshooting

### Error: "Permission denied (publickey)"

- ตรวจสอบว่าเพิ่ม public key ใน Bitbucket ครบทั้ง 3 repos
- ตรวจสอบว่า private key ใน GitHub Secrets ถูกต้อง (รวม header/footer)

### Error: "Repository not found"

- ตรวจสอบ Bitbucket repository URLs ใน workflow file
- ตรวจสอบว่ามี Write access

### Workflow ไม่ trigger

- ตรวจสอบว่า push ไปที่ branch `main`, `dev`, หรือ `staging`
- ดู Actions tab ว่ามี workflow run หรือไม่
