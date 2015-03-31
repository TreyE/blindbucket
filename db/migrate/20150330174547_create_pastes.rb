class CreatePastes < ActiveRecord::Migration
  def change
    create_table :pastes do |t|
      t.text :data
      t.string :burnkey, :null => false, :limit => 512
    end
  end
end
