  /* =====================================================================
     ضع هنا رابط Google Apps Script Web App بعد نشره (ينتهي بـ /exec)
     راجع تعليمات الربط في الشرح المرفق مع الملف
  ===================================================================== */
  const SCRIPT_URL = "PASTE_YOUR_WEB_APP_URL_HERE";

  /* ---------- عناصر عامة ---------- */
  const statusEl   = document.getElementById('statusMsg');
  const btn        = document.getElementById('submitBtn');
  const overlay    = document.getElementById('successOverlay');
  const progressFill  = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');

  /* ---------- 1) تبديل ظهور قسم "نوع الدورة" حسب نعم/كلا ---------- */
  const hasCoursesRadios = document.querySelectorAll('input[name="has_courses"]');
  const courseSubBlock   = document.getElementById('courseSubBlock');

  hasCoursesRadios.forEach(r => {
    r.addEventListener('change', () => {
      if (r.value === 'نعم' && r.checked) {
        courseSubBlock.classList.add('open');
      } else if (r.value === 'كلا' && r.checked) {
        courseSubBlock.classList.remove('open');
        courseSubBlock.querySelectorAll('input[type="checkbox"], input[type="text"], input[type="number"]')
          .forEach(el => { el.checked = false; el.value = ''; });
        document.getElementById('f_course_other_text').classList.remove('enabled');
      }
      updateProgress();
    });
  });

  /* ---------- 2) تفعيل حقل "أخرى" فقط عند تحديده ---------- */
  const otherChk  = document.getElementById('f_course_other_chk');
  const otherText = document.getElementById('f_course_other_text');
  otherChk.addEventListener('change', () => {
    otherText.classList.toggle('enabled', otherChk.checked);
    if (!otherChk.checked) otherText.value = '';
    if (otherChk.checked) otherText.focus();
  });

  /* ---------- 3) عدّاد الأحرف لحقل الملاحظات ---------- */
  const notesEl = document.getElementById('f_notes');
  const charCountEl = document.getElementById('charCount');
  notesEl.addEventListener('input', () => {
    charCountEl.textContent = notesEl.value.length;
    updateProgress();
  });

  /* ---------- 4) التحقق الفوري من رقم الهاتف والاسم ---------- */
  const nameEl  = document.getElementById('f_name');
  const phoneEl = document.getElementById('f_phone');

  function validateField(el, isValid) {
    const fieldDiv = el.closest('.field');
    fieldDiv.classList.toggle('invalid', !isValid && el.value.trim() !== '');
    fieldDiv.classList.toggle('valid', isValid);
  }

  nameEl.addEventListener('input', () => {
    validateField(nameEl, nameEl.value.trim().length >= 3);
    updateProgress();
  });

  phoneEl.addEventListener('input', () => {
    const phonePattern = /^[0-9+\s-]{7,15}$/;
    validateField(phoneEl, phonePattern.test(phoneEl.value.trim()));
    updateProgress();
  });

  /* ---------- 5) شريط التقدّم (يحسب نسبة الحقول المهمة المملوءة) ---------- */
  const progressFieldsIds = [
    'f_name', 'f_age', 'f_major', 'f_area', 'f_phone',
    'f_org', 'f_org_location', 'f_activity_type', 'f_activity_location',
    'f_hawza', 'f_notes'
  ];

  function updateProgress() {
    let filled = 0;
    let total = progressFieldsIds.length + 2; // +2 لمجموعتي الراديو

    progressFieldsIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.value.trim() !== '') filled++;
    });

    if (document.querySelector('input[name="has_courses"]:checked')) filled++;
    if (document.querySelector('input[name="membership"]:checked')) filled++;

    const percent = Math.round((filled / total) * 100);
    progressFill.style.width = percent + '%';
    progressLabel.textContent = percent + '% مكتمل';
  }

  document.querySelectorAll('input[type="text"], input[type="number"], input[type="tel"], textarea')
    .forEach(el => el.addEventListener('input', updateProgress));
  document.querySelectorAll('input[type="radio"], input[type="checkbox"]')
    .forEach(el => el.addEventListener('change', updateProgress));

  updateProgress();

  /* ---------- 6) إغلاق نافذة النجاح ---------- */
  document.getElementById('closeOverlayBtn').addEventListener('click', () => {
    overlay.classList.remove('show');
  });

  /* ---------- 7) الإرسال إلى Google Sheet عبر Apps Script API ---------- */
  btn.addEventListener('click', function () {

    const courseTypes = Array.from(document.querySelectorAll('input[name="course_type"]:checked'))
      .map(el => el.value)
      .join('، ');

    const otherCourseText = otherChk.checked ? otherText.value : '';

    const hasCoursesEl  = document.querySelector('input[name="has_courses"]:checked');
    const membershipEl  = document.querySelector('input[name="membership"]:checked');

    const data = {
      "الاسم الثلاثي واللقب": nameEl.value.trim(),
      "العمر": document.getElementById('f_age').value,
      "التخصص الأكاديمي": document.getElementById('f_major').value,
      "منطقة السكن": document.getElementById('f_area').value,
      "رقم الهاتف": phoneEl.value.trim(),
      "اسم المؤسسة": document.getElementById('f_org').value,
      "موقع المؤسسة": document.getElementById('f_org_location').value,
      "نوع النشاط": document.getElementById('f_activity_type').value,
      "مكان إقامة النشاط": document.getElementById('f_activity_location').value,
      "هل لديه دورات": hasCoursesEl ? hasCoursesEl.value : '',
      "نوع الدورة": courseTypes,
      "نوع الدورة (أخرى)": otherCourseText,
      "عدد الطلبة المشاركين": document.getElementById('f_students_count').value,
      "التخصص الحوزوي": document.getElementById('f_hawza').value,
      "الرغبة بالعضوية الدائمة": membershipEl ? membershipEl.value : '',
      "الملاحظات والمقترحات": notesEl.value,
      "تاريخ الإرسال": new Date().toLocaleString('ar-IQ')
    };

    /* تحقق نهائي قبل الإرسال */
    let hasError = false;
    if (nameEl.value.trim().length < 3) {
      validateField(nameEl, false);
      nameEl.closest('.field').classList.add('invalid');
      hasError = true;
    }
    const phonePattern = /^[0-9+\s-]{7,15}$/;
    if (!phonePattern.test(phoneEl.value.trim())) {
      phoneEl.closest('.field').classList.add('invalid');
      hasError = true;
    }

    if (hasError) {
      statusEl.style.color = '#c0392b';
      statusEl.textContent = 'الرجاء تصحيح الحقول المظللة باللون الأحمر قبل الإرسال.';
      const firstInvalid = document.querySelector('.field.invalid');
      if (firstInvalid) firstInvalid.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }

    if (SCRIPT_URL.indexOf('PASTE_YOUR_WEB_APP_URL_HERE') !== -1) {
      statusEl.style.color = '#c0392b';
      statusEl.textContent = 'لم يتم ربط النموذج بجدول البيانات بعد (راجع تعليمات الربط أسفل الملف).';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'جاري الإرسال...';
    statusEl.style.color = '#7a7468';
    statusEl.textContent = '';

    fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function () {
        statusEl.textContent = '';
        btn.textContent = 'إرسال';
        btn.disabled = false;

        // إعادة تعيين النموذج
        document.querySelectorAll('input[type="text"], input[type="number"], input[type="tel"], textarea').forEach(el => el.value = '');
        document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(el => el.checked = false);
        document.querySelectorAll('.field').forEach(el => el.classList.remove('valid', 'invalid'));
        courseSubBlock.classList.remove('open');
        otherText.classList.remove('enabled');
        charCountEl.textContent = '0';
        updateProgress();

        overlay.classList.add('show');
      })
      .catch(function () {
        statusEl.style.color = '#c0392b';
        statusEl.textContent = 'حدث خطأ أثناء الإرسال، الرجاء التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى.';
        btn.textContent = 'إرسال';
        btn.disabled = false;
      });
  });
