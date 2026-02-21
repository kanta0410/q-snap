"use server";
import { pool } from '@/lib/db';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Handle Supabase standard Postgres ssl safely locally

export async function loginStudent(id: string, pwd: string) {
    const { rows } = await pool.query('SELECT * FROM qsnap_users WHERE id = $1 AND password = $2 AND role = $3', [id, pwd, 'student']);
    if (rows.length === 0) throw new Error('Invalid credentials');
    return rows[0];
}

export async function getStudentUsageData(id: string) {
    if (!id) return 0;
    const { rows } = await pool.query('SELECT remaining_minutes FROM qsnap_users WHERE id = $1', [id]);
    return rows[0]?.remaining_minutes || 0;
}

export async function submitQuestion(studentId: string, studentGrade: string, requestType: string, imageB64: string) {
    const res = await pool.query('SELECT remaining_minutes FROM qsnap_users WHERE id = $1', [studentId]);
    let mins = res.rows[0]?.remaining_minutes || 0;
    if (mins < 15) throw new Error('残り時間がありません');

    await pool.query('UPDATE qsnap_users SET remaining_minutes = remaining_minutes - 15 WHERE id = $1', [studentId]);

    const { rows } = await pool.query(
        `INSERT INTO qsnap_questions (student_id, student_grade, request_type, image_b64) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [studentId, studentGrade, requestType, imageB64]
    );
    return rows[0];
}

export async function fetchMyQuestions(studentId: string) {
    const { rows } = await pool.query(
        `SELECT * FROM qsnap_questions WHERE student_id = $1 AND hide_for_student = false AND created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at DESC`,
        [studentId]
    );
    return rows;
}

export async function recordStripePurchase(studentId: string, minutes: number) {
    await pool.query('UPDATE qsnap_users SET remaining_minutes = remaining_minutes + $1 WHERE id = $2', [minutes, studentId]);
}

export async function getTutorQuestions() {
    const { rows } = await pool.query(`SELECT * FROM qsnap_questions WHERE hide_for_tutor = false AND created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at ASC`);
    return rows;
}

export async function updateQuestionStatus(id: string, tutorId: string, status: string, options: any = {}) {
    const sets = ['status = $2', 'tutor_id = $3'];
    const values: any[] = [id, status, tutorId];

    if (options.tutor_reply_text) {
        values.push(options.tutor_reply_text);
        sets.push(`tutor_reply_text = $${values.length}`);
    }
    if (options.tutor_reply_image_b64) {
        values.push(options.tutor_reply_image_b64);
        sets.push(`tutor_reply_image_b64 = $${values.length}`);
    }
    if (options.meeting_url) {
        values.push(options.meeting_url);
        sets.push(`meeting_url = $${values.length}`);
    }
    if (status === 'resolved') {
        sets.push('resolved_at = NOW()');
        await pool.query('UPDATE qsnap_users SET answer_count = answer_count + 1 WHERE id = $1', [tutorId]);
    }

    const { rows } = await pool.query(`UPDATE qsnap_questions SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, values);
    return rows[0];
}

export async function registerUser(id: string, pwd: string, role: string, grade: string = '') {
    await pool.query(
        `INSERT INTO qsnap_users (id, password, role, grade) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET password=$2`,
        [id, pwd, role, grade]
    );
}

export async function deleteUser(id: string) {
    await pool.query(`DELETE FROM qsnap_users WHERE id = $1`, [id]);
}

export async function getAdminData() {
    const stdRes = await pool.query(`SELECT id, remaining_minutes FROM qsnap_users WHERE role='student'`);
    const trRes = await pool.query(`SELECT id, answer_count FROM qsnap_users WHERE role='tutor'`);
    const regRes = await pool.query(`SELECT id, grade, password FROM qsnap_users WHERE role='student'`);
    return { students: stdRes.rows, tutors: trRes.rows, registeredStudents: regRes.rows };
}
