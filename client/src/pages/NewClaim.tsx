import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repairApi } from '../api';
import { useNotification } from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, TextArea, Select } from '../components/ui/Input';
import { 
  Upload, 
  X, 
  FileText
} from 'lucide-react';

const NewClaim: React.FC = () => {
  const navigate = useNavigate();
  const { notify, refreshUnreadCounts, playNotificationSound } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reporter: '',
    project_name: '',
    location: '',
    device_name: '',
    problem: '',
    priority: 'ปกติ',
    received_at: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16)
  });
  const [images, setImages] = useState<File[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      if (images.length + newImages.length > 4) {
        notify('จำกัดการอัปโหลดสูงสุด 4 รูปเท่านั้น', 'error');
        return;
      }
      setImages([...images, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const trimmedReporter = formData.reporter.trim();
    const trimmedProjectName = formData.project_name.trim();
    const trimmedLocation = formData.location.trim();
    const trimmedDeviceName = formData.device_name.trim();
    const trimmedProblem = formData.problem.trim();

    if (!trimmedReporter || !trimmedProjectName || !trimmedDeviceName || !trimmedProblem) {
      notify('กรุณากรอกข้อมูลให้ครบถ้วนในช่องที่จำเป็น', 'error');
      return;
    }

    if (trimmedReporter.length > 100) {
      notify('ชื่อผู้เบิกยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error');
      return;
    }
    if (trimmedProjectName.length > 100) {
      notify('ชื่อโครงการยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error');
      return;
    }
    if (trimmedLocation.length > 100) {
      notify('สถานที่ยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error');
      return;
    }
    if (trimmedDeviceName.length > 100) {
      notify('ชื่ออุปกรณ์ยาวเกินไป (ไม่เกิน 100 ตัวอักษร)', 'error');
      return;
    }
    if (trimmedProblem.length > 1000) {
      notify('เหตุผลการเคลมยาวเกินไป (ไม่เกิน 1000 ตัวอักษร)', 'error');
      return;
    }

    const oversized = images.some(img => img.size > 5 * 1024 * 1024);
    if (oversized) {
      notify('บางรูปภาพมีขนาดใหญ่เกินไป (จำกัดรูปละ 5MB)', 'error');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('reporter', trimmedReporter);
      data.append('project_name', trimmedProjectName);
      data.append('location', trimmedLocation);
      data.append('device_name', trimmedDeviceName);
      data.append('problem', trimmedProblem);
      data.append('priority', formData.priority);
      data.append('received_at', new Date(formData.received_at).toISOString());
      
      images.forEach(image => {
        data.append('images', image);
      });

      await repairApi.createClaim(data);
      notify('🎉 ส่งข้อมูลเคลมเรียบร้อยแล้ว');
      playNotificationSound();
      refreshUnreadCounts();
      navigate('/repairs');
    } catch (error) {
      console.error('Error creating claim:', error);
      notify('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-claim-page" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <div className="page-title">
          <h2>แจ้งเคลมอุปกรณ์</h2>
          <p>กรอกรายละเอียดการเคลมอุปกรณ์ที่ต้องการส่งเข้าศูนย์บริการเพื่อตรวจเช็ค</p>
        </div>
      </div>
      
      <Card style={{ maxWidth: '800px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <Input 
              label="ชื่อผู้เบิก / หน่วยงาน"
              required 
              maxLength={100}
              placeholder="ระบุชื่อผู้รับ..."
              value={formData.reporter}
              onChange={(e) => setFormData({...formData, reporter: e.target.value})}
            />
          </div>

          <div className="form-grid">
            <Select 
              label="ระดับความสำคัญ"
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
            >
              <option value="ปกติ">ปกติ (Normal)</option>
              <option value="ด่วน">ด่วน (High)</option>
            </Select>
            <Input 
              label="โครงการ / งาน"
              required 
              maxLength={100}
              placeholder="ระบุชื่อโครงการ..."
              value={formData.project_name}
              onChange={(e) => setFormData({...formData, project_name: e.target.value})}
            />
          </div>

          <Input 
            label="สถานที่ / หน้างาน"
            maxLength={100}
            placeholder="ระบุสถานที่..."
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
          />

          <Input 
            label="ชื่ออุปกรณ์ / รุ่น (เพื่อการเคลม)"
            required 
            maxLength={100}
            placeholder="ชื่ออุปกรณ์และ Serial Number"
            value={formData.device_name}
            onChange={(e) => setFormData({...formData, device_name: e.target.value})}
          />

          <TextArea 
            label="เหตุผลการเคลม / อาการเสีย"
            required 
            rows={4}
            maxLength={1000}
            placeholder="ระบุรายละเอียดอาการที่ต้องการเคลม..."
            value={formData.problem}
            onChange={(e) => setFormData({...formData, problem: e.target.value})}
          />

          <div className="form-group">
            <label><FileText size={16} color="var(--primary)" /> รูปภาพหลักฐานการเคลม (สูงสุด 4 รูป)</label>
            <div className="image-uploader-grid" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {images.map((image, index) => (
                <div key={index} className="image-preview-card">
                  <img src={URL.createObjectURL(image)} alt="preview" />
                  <button type="button" className="remove-btn" onClick={() => removeImage(index)} disabled={loading}>
                    <X size={16} />
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                images.length === 0 ? (
                  <label className="image-uploader-box" style={{ width: '100%', height: '120px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                    <Upload size={24} style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>คลิกเพื่อเลือกรูปภาพหลักฐานการเคลม</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>รองรับไฟล์ JPG, PNG (สูงสุด 4 รูป)</span>
                    <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} disabled={loading} />
                  </label>
                ) : (
                  <label className="image-uploader-box" style={{ width: '100px', height: '100px', padding: 0, cursor: loading ? 'not-allowed' : 'pointer' }}>
                    <Upload size={20} />
                    <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>เพิ่มรูปภาพ</span>
                    <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} disabled={loading} />
                  </label>
                )
              )}
            </div>
          </div>

          <div className="form-actions">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={loading}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="primary" loading={loading} disabled={loading}>
              ส่งข้อมูลเคลม
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default NewClaim;
