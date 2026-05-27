import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repairApi } from '../api';
import { useNotification } from '../components/Layout';
import { 
  Upload, 
  X, 
  AlertTriangle, 
  User, 
  MapPin, 
  Laptop, 
  AlertCircle,
  FileText
} from 'lucide-react';

const NewRepair: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reporter: '',
    location: '',
    device_name: '',
    problem: '',
    priority: 'ปกติ'
  });
  const [images, setImages] = useState<File[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      if (images.length + newImages.length > 2) {
        notify('จำกัดการอัปโหลดสูงสุด 2 รูปเท่านั้น', 'error');
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
    const oversized = images.some(img => img.size > 5 * 1024 * 1024);
    if (oversized) {
      notify('บางรูปภาพมีขนาดใหญ่เกินไป (จำกัดรูปละ 5MB)', 'error');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });
      images.forEach(image => {
        data.append('images', image);
      });

      await repairApi.create(data);
      notify('🎉 ส่งข้อมูลแจ้งซ่อมเรียบร้อยแล้ว');
      navigate('/repairs');
    } catch (error) {
      console.error('Error creating repair:', error);
      notify('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-repair-page">
      <div className="page-header">
        <div className="page-title">
          <h2>แจ้งซ่อมอุปกรณ์ / แจ้งปัญหา</h2>
          <p>กรุณากรอกข้อมูลให้ครบถ้วนเพื่อให้ช่างดำเนินการได้รวดเร็วขึ้น</p>
        </div>
      </div>
      
      <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label><User size={16} color="var(--primary)" /> ชื่อผู้แจ้ง / หน่วยงาน</label>
              <input 
                type="text" 
                required 
                placeholder="ระบุชื่อของคุณ หรือชื่อแผนก"
                value={formData.reporter}
                onChange={(e) => setFormData({...formData, reporter: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label><AlertTriangle size={16} color="var(--warning)" /> ระดับความสำคัญ</label>
              <select 
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
              >
                <option value="ปกติ">ปกติ (Normal)</option>
                <option value="ด่วน">ด่วน (High)</option>
                <option value="ด่วนมาก">ด่วนมาก (Critical)</option>
                <option value="วิกฤต">วิกฤต (Urgent)</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label><Laptop size={16} color="var(--primary)" /> ชื่ออุปกรณ์ / รุ่น</label>
              <input 
                type="text" 
                required 
                placeholder="เช่น เครื่องพิมพ์ HP LaserJet, จอ Monitor"
                value={formData.device_name}
                onChange={(e) => setFormData({...formData, device_name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label><MapPin size={16} color="var(--danger)" /> สถานที่ / จุดติดตั้ง</label>
              <input 
                type="text" 
                required 
                placeholder="เช่น ห้องประชุมชั้น 2, แผนกบัญชี"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label><AlertCircle size={16} color="var(--primary)" /> อาการเสีย / รายละเอียดปัญหา</label>
            <textarea 
              required 
              rows={4}
              placeholder="อธิบายอาการเสียที่พบอย่างละเอียด..."
              value={formData.problem}
              onChange={(e) => setFormData({...formData, problem: e.target.value})}
            ></textarea>
          </div>

          <div className="form-group">
            <label><FileText size={16} color="var(--primary)" /> รูปภาพประกอบอาการเสีย (สูงสุด 2 รูป)</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {images.map((image, index) => (
                <div key={index} style={{ position: 'relative', width: '140px', height: '140px', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                  <img 
                    src={URL.createObjectURL(image)} 
                    alt="preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  <button 
                    type="button" 
                    onClick={() => removeImage(index)}
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(239, 68, 68, 0.9)', border: 'none', borderRadius: '50%', width: '28px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', backdropFilter: 'blur(4px)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {images.length < 2 && (
                <label style={{ width: '140px', height: '140px', border: '2px dashed var(--border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s', background: '#f8fafc' }}>
                  <Upload size={24} />
                  <span style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600 }}>เพิ่มรูปภาพ</span>
                  <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '2.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '12px 35px' }}>
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '12px 50px', fontSize: '1rem' }}>
              {loading ? 'กำลังบันทึกข้อมูล...' : 'ส่งข้อมูลแจ้งซ่อม'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewRepair;
